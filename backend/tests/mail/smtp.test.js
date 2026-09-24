// Separater Test: benötigt OpenSSL, sendet ausschließlich an einen lokalen Testserver.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { SMTPServer } from 'smtp-server';
import nodemailer from 'nodemailer';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createMailer } from '../../src/modules/auth/mailer.js';
import { createApp } from '../../src/app.js';
import { up } from '../../src/modules/auth/authMigration.js';

async function fixture(t, { secure = false, trusted = true, password = 'test-only', starttls = true } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'studyprio-smtp-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const keyFile = join(directory, 'key.pem'), certFile = join(directory, 'cert.pem');
  // Nur temporäre Testschlüssel, kein Zertifikat und kein Schlüssel im Repository.
  await promisify(execFile)('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyFile, '-out', certFile, '-days', '1', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost']);
  const cert = await readFile(certFile), messages = [], authenticated = [];
  const smtp = new SMTPServer({ secure, key: await readFile(keyFile), cert,
    disabledCommands: starttls ? [] : ['STARTTLS'], logger: false,
    onAuth(auth, session, callback) {
      if (!session.secure || auth.username !== 'studyprio-test' || auth.password !== 'test-only') {
        const error = new Error('Testzugang abgelehnt'); error.responseCode = 535;
        return callback(error);
      }
      authenticated.push(session.secure); callback(null, { user: 'studyprio-test' });
    },
    onData(stream, session, callback) {
      let raw = '';
      stream.on('data', chunk => { raw += chunk.toString(); });
      stream.on('end', () => { messages.push({ raw, envelope: session.envelope, secure: session.secure }); callback(); });
      stream.on('error', callback);
    }
  });
  // TLS-Abbrüche in den negativen Tests dürfen den Prozess nicht beenden.
  smtp.on('error', () => {});
  await new Promise((resolve, reject) => { smtp.server.once('error', reject); smtp.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => smtp.close(resolve)));
  const config = { appOrigin: 'http://localhost:5173', secure: false, mailMode: 'smtp', allowedDomains: ['campus.example'],
    smtp: { host: '127.0.0.1', port: secure ? 465 : 587, user: 'studyprio-test', pass: password, from: 'app@campus.example' } };
  const mailer = createMailer(config, { createTransport(options) {
    // Echter Nodemailer-Transport: nur Testport und temporäres Vertrauenszertifikat.
    return nodemailer.createTransport({ ...options, port: smtp.server.address().port,
      tls: { servername: 'localhost', ...(trusted ? { ca: cert } : {}) } });
  } });
  const openDb = async () => {
    const db = await open({ filename: join(directory, 'auth.sqlite'), driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON'); return db;
  };
  const db = await openDb(); await up(db); await db.close();
  const runtime = createApp({ openDb, config, mailer });
  await runtime.repository.ensureMailMode('smtp');
  const http = runtime.app.listen(0, '127.0.0.1'); await once(http, 'listening');
  t.after(async () => { http.closeAllConnections(); await new Promise(resolve => http.close(resolve)); });
  async function request(route, body, cookie) {
    const response = await fetch(`http://127.0.0.1:${http.address().port}/api/auth${route}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { Origin: config.appOrigin,
        'Content-Type': 'application/json', 'X-StudyPrio-Request': '1', ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0],
      data: response.status === 204 ? null : await response.json() };
  }
  return { request, messages, authenticated, mailer, openDb };
}

function mailText(raw) {
  const separator = raw.indexOf('\r\n\r\n');
  const headers = raw.slice(0, separator), body = raw.slice(separator + 4);
  if (/Content-Transfer-Encoding: base64/i.test(headers)) return Buffer.from(body, 'base64').toString();
  return body.replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

test('SMTP: STARTTLS und direktes TLS liefern den Anmeldelink; HTTP-Login und Logout funktionieren', async t => {
  for (const secure of [false, true]) {
    const f = await fixture(t, { secure });
    await f.mailer.verifyConnection();
    assert.equal(f.messages.length, 0, 'Verbindungsprüfung versendet keine Mail');
    const requested = await f.request('/request-link', { email: 'student@campus.example' });
    assert.equal(requested.status, 202);
    assert.equal(f.messages.length, 1);
    const message = f.messages[0];
    assert.equal(message.secure, true);
    assert.ok(f.authenticated.length >= 2);
    assert.equal(message.envelope.rcptTo[0].address, 'student@campus.example');
    const link = mailText(message.raw).match(/http:\/\/localhost:5173\/auth\/verify#token=[A-Za-z0-9_-]+/)?.[0];
    assert.ok(link, 'Mail enthält einen verwendbaren Link');
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get('token');
    assert.ok(!JSON.stringify(requested.data).includes(token));
    const verified = await f.request('/verify', { token });
    assert.equal(verified.status, 200);
    assert.equal(verified.data.data.email, 'student@campus.example');
    assert.equal((await f.request('/me', undefined, verified.cookie)).status, 200);
    assert.equal((await f.request('/verify', { token })).status, 400);
    assert.equal((await f.request('/logout', {}, verified.cookie)).status, 204);
    assert.equal((await f.request('/me', undefined, verified.cookie)).status, 401);
  }
});

test('SMTP: ungültiges Zertifikat, falscher Zugang und fehlendes STARTTLS hinterlassen keinen Login', async t => {
  for (const options of [{ trusted: false }, { password: 'wrong' }, { starttls: false }]) {
    const f = await fixture(t, options);
    const response = await f.request('/request-link', { email: 'student@campus.example' });
    assert.equal(response.status, 503);
    assert.equal(response.data.error.code, 'MAIL_UNAVAILABLE');
    assert.equal(response.cookie, undefined);
    assert.equal(f.messages.length, 0);
    const db = await f.openDb();
    try {
      for (const table of ['users', 'auth_sessions', 'auth_login_tokens']) {
        assert.equal((await db.get(`SELECT count(*) AS n FROM ${table}`)).n, 0);
      }
    } finally { await db.close(); }
  }
});
