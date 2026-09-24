import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { up } from '../../src/modules/auth/authMigration.js';
import { createAuthRepository } from '../../src/modules/auth/authRepository.js';
import { createAuthService } from '../../src/modules/auth/authService.js';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'studyprio-auth-'));
  const openDb = async () => {
    const db = await open({ filename: join(directory, 'auth.sqlite'), driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON;');
    return db;
  };
  t.after(() => rm(directory, { recursive: true, force: true }));
  const db = await openDb();
  await up(db);
  await db.close();
  const messages = [];
  let time = new Date('2026-09-22T12:00:00.000Z');
  const repository = createAuthRepository({ openDb });
  const options = {
    repository, allowedDomains: ['campus.example'], appOrigin: 'http://localhost:5173',
    now: () => new Date(time),
    mailer: { async sendLoginLink(message) { messages.push(message); } }
  };
  return {
    service: createAuthService(options), options, openDb, messages,
    advance(ms) { time = new Date(time.getTime() + ms); },
    token(index = messages.length - 1) {
      return new URLSearchParams(new URL(messages[index].url).hash.slice(1)).get('token');
    }
  };
}

test('UC-01: request stores only token hash and does not create a user', async t => {
  const f = await fixture(t);
  const response = await f.service.requestLoginLink(' Student@CAMPUS.EXAMPLE ');
  assert.deepEqual(Object.keys(response), ['message']);
  assert.equal(f.messages[0].email, 'student@campus.example');
  const url = new URL(f.messages[0].url);
  assert.equal(url.origin, 'http://localhost:5173');
  assert.equal(url.search, '');
  const db = await f.openDb();
  try {
    const row = await db.get('SELECT * FROM auth_login_tokens');
    assert.equal(row.tokenHash, createHash('sha256').update(f.token()).digest('hex'));
    assert.ok(!JSON.stringify(row).includes(f.token()));
    assert.equal(row.expiresAt, '2026-09-22T12:15:00.000Z');
    assert.equal((await db.get('SELECT COUNT(*) AS count FROM users')).count, 0);
  } finally { await db.close(); }
});

test('UC-01: valid link creates verified user; a later login keeps the same id', async t => {
  const f = await fixture(t);
  await f.service.requestLoginLink('student@campus.example');
  const user = await f.service.verifyLoginToken(f.token());
  assert.match(user.id, /^[a-f0-9-]{36}$/);
  assert.equal(user.emailVerifiedAt, '2026-09-22T12:00:00.000Z');
  await f.service.requestLoginLink('STUDENT@campus.example');
  const again = await f.service.verifyLoginToken(f.token());
  assert.deepEqual(again, user);
  assert.deepEqual(await f.service.findVerifiedByEmail('student@campus.example'), user);
});

test('UC-01: used link cannot be reused', async t => {
  const f = await fixture(t);
  await f.service.requestLoginLink('student@campus.example');
  await f.service.verifyLoginToken(f.token());
  await assert.rejects(f.service.verifyLoginToken(f.token()), { code: 'INVALID_LOGIN_LINK' });
});

test('UC-01: only one of two concurrent confirmations succeeds', async t => {
  const f = await fixture(t);
  await f.service.requestLoginLink('student@campus.example');
  const attempts = await Promise.allSettled([
    f.service.verifyLoginToken(f.token()), f.service.verifyLoginToken(f.token())
  ]);
  assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(item => item.status === 'rejected').reason.code, 'INVALID_LOGIN_LINK');
});

test('UC-01: expires exactly at fifteen minutes', async t => {
  const f = await fixture(t);
  await f.service.requestLoginLink('student@campus.example');
  f.advance(15 * 60 * 1000);
  await assert.rejects(f.service.verifyLoginToken(f.token()), { code: 'INVALID_LOGIN_LINK' });
  assert.equal(await f.service.findVerifiedByEmail('student@campus.example'), null);
});

test('UC-01: valid immediately before expiry', async t => {
  const f = await fixture(t);
  await f.service.requestLoginLink('student@campus.example');
  f.advance(15 * 60 * 1000 - 1);
  assert.equal((await f.service.verifyLoginToken(f.token())).email, 'student@campus.example');
});

test('UC-01: invalid email/domain never sends mail', async t => {
  const f = await fixture(t);
  for (const email of [null, 123, '', 'x@campus.example.evil', 'x@sub.campus.example',
    'x@gmail.com', 'x@@campus.example', 'a..b@campus.example', 'x@campus.example\r\nBcc: y@evil.example']) {
    await assert.rejects(f.service.requestLoginLink(email), { code: 'INVALID_EMAIL' });
  }
  assert.equal(f.messages.length, 0);
});

test('UC-01: malformed/unknown tokens fail without account creation', async t => {
  const f = await fixture(t);
  for (const token of [null, {}, '', 'short', randomBytes(32).toString('base64url')]) {
    await assert.rejects(f.service.verifyLoginToken(token), { code: 'INVALID_LOGIN_LINK' });
  }
});

test('UC-01: mail failure revokes token and reports safe error', async t => {
  const f = await fixture(t);
  const service = createAuthService({ ...f.options, mailer: {
    async sendLoginLink(message) { f.messages.push(message); throw new Error('SMTP secret'); }
  } });
  await assert.rejects(service.requestLoginLink('student@campus.example'), error => {
    assert.equal(error.code, 'MAIL_UNAVAILABLE');
    assert.equal(error.status, 503);
    assert.ok(!error.message.includes('SMTP secret'));
    return true;
  });
  await assert.rejects(service.verifyLoginToken(f.token()), { code: 'INVALID_LOGIN_LINK' });
});

test('UC-01: unverified addresses are not in userDirectory', async t => {
  const f = await fixture(t);
  await f.service.requestLoginLink('student@campus.example');
  assert.equal(await f.service.findVerifiedByEmail('student@campus.example'), null);
});

test('auth migration is repeatable without deleting users', async t => {
  const f = await fixture(t);
  await f.service.requestLoginLink('student@campus.example');
  const user = await f.service.verifyLoginToken(f.token());
  const db = await f.openDb();
  try { await up(db); } finally { await db.close(); }
  assert.deepEqual(await f.service.findVerifiedByEmail(user.email), user);
});

test('failed user insert rolls back token consumption', async t => {
  const f = await fixture(t);
  await f.service.requestLoginLink('student@campus.example');
  const db = await f.openDb();
  try {
    await db.exec(`CREATE TRIGGER fail_user BEFORE INSERT ON users
      BEGIN SELECT RAISE(ABORT, 'test database failure'); END;`);
    await assert.rejects(f.service.verifyLoginToken(f.token()), /test database failure/);
    assert.equal((await db.get('SELECT usedAt FROM auth_login_tokens')).usedAt, null);
    await db.exec('DROP TRIGGER fail_user;');
    assert.equal((await f.service.verifyLoginToken(f.token())).email, 'student@campus.example');
  } finally { await db.close(); }
});

test('configuration rejects missing domains, mailer and unsafe public origin', async t => {
  const f = await fixture(t);
  for (const patch of [ { allowedDomains: [] }, { allowedDomains: ['*.example'] },
    { mailer: null }, { appOrigin: 'http://public.example' },
    { appOrigin: 'https://public.example/redirect?to=evil' },
    { appOrigin: 'https://user:secret@public.example' } ]) {
    assert.throws(() => createAuthService({ ...f.options, ...patch }));
  }
});
