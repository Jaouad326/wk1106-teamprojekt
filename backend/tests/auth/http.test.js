import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createApp } from '../../src/app.js';
import { up } from '../../src/modules/auth/authMigration.js';
import { up as commentsMigration } from '../../src/modules/comments/commentMigration.js';
import { up as groupsMigration } from '../../src/modules/groups/groupMigration.js';
import { up as tasksMigration } from '../../src/modules/tasks/taskMigration.js';
import { SESSION_MS } from '../../src/modules/auth/sessionService.js';
import { readAuthConfig } from '../../src/config/authConfig.js';
import { createMailer } from '../../src/modules/auth/mailer.js';

async function fixture(t, { secure = false, failMail = false, mountFeatures } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'studyprio-http-'));
  const openDb = async () => {
    const db = await open({ filename: join(directory, 'test.sqlite'), driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON');
    return db;
  };
  const db = await openDb();
  // Reihenfolge wie in scripts/migrate.js: createApp bindet Gruppen- und Aufgabenrouten fest ein.
  await up(db); await commentsMigration(db); await groupsMigration(db); await tasksMigration(db); await db.close();
  const messages = [];
  let time = new Date('2026-09-23T12:00:00.000Z');
  const config = { appOrigin: secure ? 'https://study.example' : 'http://localhost:5173',
    secure, allowedDomains: ['campus.example'], mailMode: 'local' };
  const options = { openDb, config, mountFeatures, now: () => new Date(time), mailer: {
    async sendLoginLink(message) { messages.push(message); if (failMail) throw new Error('SMTP PASSWORD'); }
  } };
  const servers = [];
  let current;
  async function start() {
    current = createApp(options);
    const server = current.app.listen(0, '127.0.0.1');
    servers.push(server);
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
  }
  let url = await start();
  t.after(async () => {
    for (const server of servers) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    await rm(directory, { recursive: true, force: true });
  });
  async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
    const response = await fetch(url + path, { method, headers: {
      ...(method === 'GET' ? {} : { origin: config.appOrigin, 'content-type': 'application/json', 'x-studyprio-request': '1' }),
      ...(cookie ? { cookie } : {}), ...headers
    }, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
    return { status: response.status, headers: response.headers, data: response.status === 204 ? null : await response.json() };
  }
  const token = () => new URLSearchParams(new URL(messages.at(-1).url).hash.slice(1)).get('token');
  async function login(cookie) {
    assert.equal((await request('/api/auth/request-link', { method: 'POST', body: { email: 'a@campus.example' } })).status, 202);
    const response = await request('/api/auth/verify', { method: 'POST', body: { token: token() }, cookie });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  return { request, messages, token, login, openDb,
    repository: current.repository,
    advance(ms) { time = new Date(time.getTime() + ms); },
    async restart() { url = await start(); },
    cleanup() { return current.repository.cleanup(time); }
  };
}

test('HTTP: login, persistent session after restart, logout and revoked cookie', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/auth/me')).status, 401);
  const cookie = await f.login();
  const before = await f.request('/api/auth/me', { cookie });
  assert.equal(before.data.data.email, 'a@campus.example');
  assert.equal(before.headers.get('cache-control'), 'no-store');
  await f.restart();
  assert.deepEqual((await f.request('/api/auth/me', { cookie })).data, before.data);
  const logout = await f.request('/api/auth/logout', { method: 'POST', body: {}, cookie });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  assert.equal((await f.request('/api/auth/me', { cookie })).status, 401);
});

test('HTTP: secure cookie flags and only hash in SQLite', async t => {
  const f = await fixture(t, { secure: true });
  await f.request('/api/auth/request-link', { method: 'POST', body: { email: 'a@campus.example' } });
  const response = await f.request('/api/auth/verify', { method: 'POST', body: { token: f.token() } });
  const cookie = response.headers.get('set-cookie');
  for (const flag of ['__Host-studyprio_session=', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=604800']) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes('Domain='));
  const db = await f.openDb();
  try {
    const row = await db.get('SELECT * FROM auth_sessions');
    assert.match(row.tokenHash, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(row).includes(cookie.split(';')[0].split('=')[1]));
    assert.deepEqual(Object.keys(response.data.data).sort(), ['createdAt', 'displayName', 'email', 'emailVerifiedAt', 'id']);
  } finally { await db.close(); }
});

test('HTTP: authenticated user can update and read their display name', async t => {
  const f = await fixture(t);
  const cookie = await f.login();
  const update = await f.request('/api/auth/profile', {
    method: 'PATCH', body: { displayName: 'Bassim Hassan' }, cookie
  });
  assert.equal(update.status, 200);
  assert.equal(update.data.data.displayName, 'Bassim Hassan');
  assert.equal((await f.request('/api/auth/me', { cookie })).data.data.displayName, 'Bassim Hassan');
  assert.equal((await f.request('/api/auth/profile', {
    method: 'PATCH', body: { displayName: 'x'.repeat(81) }, cookie
  })).status, 400);
});

test('HTTP: new login rotates session; expired and forged sessions are denied', async t => {
  const f = await fixture(t);
  const oldCookie = await f.login();
  const cookie = await f.login(oldCookie);
  assert.notEqual(cookie, oldCookie);
  assert.equal((await f.request('/api/auth/me', { cookie: oldCookie })).status, 401);
  f.advance(SESSION_MS - 1);
  assert.equal((await f.request('/api/auth/me', { cookie })).status, 200);
  f.advance(1);
  assert.equal((await f.request('/api/auth/me', { cookie })).status, 401);
  assert.equal((await f.request('/api/auth/me', { cookie: `studyprio_session=${'a'.repeat(43)}` })).status, 401);
});

test('HTTP: CSRF protection rejects wrong origin, missing header and form body', async t => {
  const f = await fixture(t);
  for (const path of ['/api/auth/request-link', '/api/auth/verify', '/api/auth/logout']) {
    for (const headers of [{ origin: 'https://evil.example' }, { origin: '' }, { 'x-studyprio-request': '' }]) {
      assert.equal((await f.request(path, { method: 'POST', headers, body: {} })).status, 403);
    }
    assert.equal((await f.request(path, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415);
  }
  assert.equal(f.messages.length, 0);
});

test('HTTP: link is not consumed by GET, then can only be confirmed once', async t => {
  const f = await fixture(t);
  await f.request('/api/auth/request-link', { method: 'POST', body: { email: 'a@campus.example' } });
  const token = f.token();
  assert.equal((await f.request(`/api/auth/verify?token=${token}`)).status, 404);
  const attempts = await Promise.all([1, 2].map(() => f.request('/api/auth/verify', { method: 'POST', body: { token } })));
  assert.deepEqual(attempts.map(r => r.status).sort(), [200, 400]);
});

test('HTTP: mail limit survives restart and resets after 15 minutes', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 3; i++) assert.equal((await f.request('/api/auth/request-link', { method: 'POST', body: { email: 'a@campus.example' } })).status, 202);
  await f.restart();
  const limited = await f.request('/api/auth/request-link', { method: 'POST', body: { email: 'A@campus.example' } });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '900');
  assert.equal(f.messages.length, 3);
  f.advance(900000);
  assert.equal((await f.request('/api/auth/request-link', { method: 'POST', body: { email: 'a@campus.example' } })).status, 202);
});

test('HTTP: verification rate limit ignores forged forwarding headers', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 30; i++) assert.equal((await f.request('/api/auth/verify', { method: 'POST', body: { token: 'bad' } })).status, 400);
  assert.equal((await f.request('/api/auth/verify', { method: 'POST', body: {}, headers: { 'x-forwarded-for': '1.2.3.4' } })).status, 429);
});

test('HTTP: mail failure is safe and does not create a session or valid link', async t => {
  const f = await fixture(t, { failMail: true });
  const result = await f.request('/api/auth/request-link', { method: 'POST', body: { email: 'a@campus.example' } });
  assert.equal(result.status, 503);
  assert.ok(!JSON.stringify(result).includes('SMTP PASSWORD'));
  const verify = await f.request('/api/auth/verify', { method: 'POST', body: { token: f.token() } });
  assert.equal(verify.status, 400);
  assert.equal(verify.headers.get('set-cookie'), null);
});

test('HTTP: session insert failure rolls back account and link together', async t => {
  const f = await fixture(t);
  await f.request('/api/auth/request-link', { method: 'POST', body: { email: 'a@campus.example' } });
  const db = await f.openDb();
  try {
    await db.exec("CREATE TRIGGER fail_session BEFORE INSERT ON auth_sessions BEGIN SELECT RAISE(ABORT, 'db secret'); END;");
    const result = await f.request('/api/auth/verify', { method: 'POST', body: { token: f.token() } });
    assert.equal(result.status, 500);
    assert.ok(!JSON.stringify(result).includes('db secret'));
    assert.equal((await db.get('SELECT count(*) AS n FROM users')).n, 0);
    assert.equal((await db.get('SELECT usedAt FROM auth_login_tokens')).usedAt, null);
    await db.exec('DROP TRIGGER fail_session');
    assert.equal((await f.request('/api/auth/verify', { method: 'POST', body: { token: f.token() } })).status, 200);
  } finally { await db.close(); }
});

test('HTTP: invalid JSON, large input and comments on unknown tasks fail safely', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/auth/request-link', { method: 'POST', body: '{' })).status, 400);
  assert.equal((await f.request('/api/auth/request-link', { method: 'POST', body: { email: 'x'.repeat(9000) } })).status, 413);
  assert.equal((await f.request('/api/tasks/test/comments')).status, 401);
  const cookie = await f.login();
  // Kommentare sind jetzt an echte Aufgaben gebunden; eine unbekannte Task-ID ist 404, kein Platzhalter mehr.
  assert.equal((await f.request('/api/tasks/test/comments', { cookie })).status, 404);
});

test('cleanup removes expired tokens, sessions and limits but keeps users', async t => {
  const f = await fixture(t);
  await f.login();
  f.advance(SESSION_MS);
  await f.cleanup();
  const db = await f.openDb();
  try {
    for (const table of ['auth_login_tokens', 'auth_sessions', 'auth_limits']) assert.equal((await db.get(`SELECT count(*) AS n FROM ${table}`)).n, 0);
    assert.equal((await db.get('SELECT count(*) AS n FROM users')).n, 1);
  } finally { await db.close(); }
});

test('configuration prevents public/local-mode misuse and requires complete SMTP settings', () => {
  const env = { MAIL_MODE: 'local', ALLOWED_EMAIL_DOMAINS: 'campus.example' };
  assert.equal(readAuthConfig(env).host, '127.0.0.1');
  for (const patch of [{ NODE_ENV: 'production' }, { APP_ORIGIN: 'https://public.example' },
    { APP_ORIGIN: 'https://a:b@localhost' }, { MAIL_MODE: 'smtp' }, { ALLOWED_EMAIL_DOMAINS: '' }, { PORT: 'no' }]) {
    assert.throws(() => readAuthConfig({ ...env, ...patch }));
  }
});

test('SMTP adapter uses TLS and reports rejected mail without real delivery', async () => {
  let options, message;
  const config = { mailMode: 'smtp', smtp: { host: 'smtp.example', port: 587, user: 'test', pass: 'test', from: 'app@example.org' } };
  const mailer = createMailer(config, { createTransport(value) {
    options = value;
    return { async sendMail(value) { message = value; return { accepted: [], rejected: ['a@campus.example'] }; } };
  } });
  await assert.rejects(mailer.sendLoginLink({ email: 'a@campus.example', url: 'https://study.example/auth/verify#token=test' }));
  assert.equal(options.requireTLS, true);
  assert.equal(options.secure, false);
  assert.equal(message.to, 'a@campus.example');
  assert.match(message.text, /15 Minuten/);
});

test('Team route hook runs before fallback and shares session middleware/user directory', async t => {
  let dependencies;
  const f = await fixture(t, { mountFeatures(app, shared) {
    dependencies = shared;
    app.get('/api/team-check', shared.requireAuth, (req, res) => res.json({ data: req.user.id }));
    return { mounted: true };
  } });
  assert.equal((await f.request('/api/team-check')).status, 401);
  const cookie = await f.login();
  const response = await f.request('/api/team-check', { cookie });
  assert.equal(response.status, 200);
  const user = await dependencies.userDirectory.findVerifiedByEmail(' A@CAMPUS.EXAMPLE ');
  assert.equal(user.id, response.data.data);
  for (const email of ['wrong', 'a@not-allowed.example', null]) {
    assert.equal(await dependencies.userDirectory.findVerifiedByEmail(email), null);
  }
});

test('Local test database cannot be promoted to SMTP; legacy users also block adoption', async t => {
  const f = await fixture(t);
  await f.repository.ensureMailMode('local');
  await f.repository.ensureMailMode('local');
  await assert.rejects(f.repository.ensureMailMode('smtp'), { code: 'AUTH_MAIL_MODE_MISMATCH' });
  const old = await fixture(t);
  await old.login();
  await assert.rejects(old.repository.ensureMailMode('smtp'), { code: 'AUTH_MAIL_MODE_MISMATCH' });
  await old.repository.ensureMailMode('local');
  const clean = await fixture(t);
  await clean.repository.ensureMailMode('smtp');
  await clean.repository.ensureMailMode('smtp');
  await assert.rejects(clean.repository.ensureMailMode('local'), { code: 'AUTH_MAIL_MODE_MISMATCH' });
});
