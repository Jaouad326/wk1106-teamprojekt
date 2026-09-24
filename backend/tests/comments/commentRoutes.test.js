import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createApp } from '../../src/app.js';
import { up as authMigration } from '../../src/modules/auth/authMigration.js';
import { up as commentsMigration } from '../../src/modules/comments/commentMigration.js';
import { up as groupsMigration } from '../../src/modules/groups/groupMigration.js';
import { up as tasksMigration } from '../../src/modules/tasks/taskMigration.js';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'studyprio-comments-'));
  const openDb = async () => {
    const db = await open({ filename: join(directory, 'test.sqlite'), driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON');
    return db;
  };
  const db = await openDb();
  await authMigration(db); await commentsMigration(db); await groupsMigration(db); await tasksMigration(db);
  await db.close();
  const config = { appOrigin: 'http://localhost:5173', secure: false, allowedDomains: ['campus.example'], mailMode: 'local' };
  const messages = [];
  const { app } = createApp({ openDb, config, mailer: { async sendLoginLink(message) { messages.push(message); } } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });

  async function request(path, { method = 'GET', body, cookie } = {}) {
    const response = await fetch(url + path, {
      method,
      headers: { ...(method === 'GET' ? {} : { origin: config.appOrigin, 'content-type': 'application/json', 'x-studyprio-request': '1' }), ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }
  async function login(email) {
    await request('/api/auth/request-link', { method: 'POST', body: { email } });
    const token = new URLSearchParams(new URL(messages.at(-1).url).hash.slice(1)).get('token');
    const response = await fetch(url + '/api/auth/verify', {
      method: 'POST', headers: { origin: config.appOrigin, 'content-type': 'application/json', 'x-studyprio-request': '1' }, body: JSON.stringify({ token })
    });
    const user = (await response.json()).data;
    return { cookie: response.headers.get('set-cookie').split(';')[0], user };
  }
  return { request, login };
}

test('comments: unauthenticated access is rejected and unknown tasks are 404', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/tasks/does-not-exist/comments')).status, 401);
  const { cookie } = await f.login('owner@campus.example');
  assert.equal((await f.request('/api/tasks/does-not-exist/comments', { cookie })).status, 404);
});

test('comments: owner can write and read comments on their own personal task', async t => {
  const f = await fixture(t);
  const { cookie, user } = await f.login('owner@campus.example');
  const task = (await f.request('/api/tasks', {
    method: 'POST', cookie, body: { title: 'Aufgabe', dueAt: '2026-10-01T10:00:00.000Z', importance: 3, difficulty: 2, effortHours: 1 }
  })).data.data;
  const created = await f.request(`/api/tasks/${task.id}/comments`, { method: 'POST', cookie, body: { body: 'Erster Kommentar' } });
  assert.equal(created.status, 201);
  assert.equal(created.data.data.authorId, user.id);
  const list = await f.request(`/api/tasks/${task.id}/comments`, { cookie });
  assert.equal(list.data.data.length, 1);
  assert.equal(list.data.data[0].body, 'Erster Kommentar');
});

test('comments: a stranger without task access is forbidden from reading or writing', async t => {
  const f = await fixture(t);
  const owner = await f.login('owner@campus.example');
  const task = (await f.request('/api/tasks', {
    method: 'POST', cookie: owner.cookie, body: { title: 'Privat', dueAt: '2026-10-01T10:00:00.000Z', importance: 3, difficulty: 2, effortHours: 1 }
  })).data.data;
  const stranger = await f.login('stranger@campus.example');
  assert.equal((await f.request(`/api/tasks/${task.id}/comments`, { cookie: stranger.cookie })).status, 403);
  assert.equal((await f.request(`/api/tasks/${task.id}/comments`, { method: 'POST', cookie: stranger.cookie, body: { body: 'Darf ich nicht' } })).status, 403);
});

test('comments: empty or oversized bodies are rejected', async t => {
  const f = await fixture(t);
  const owner = await f.login('owner@campus.example');
  const task = (await f.request('/api/tasks', {
    method: 'POST', cookie: owner.cookie, body: { title: 'Aufgabe', dueAt: '2026-10-01T10:00:00.000Z', importance: 3, difficulty: 2, effortHours: 1 }
  })).data.data;
  assert.equal((await f.request(`/api/tasks/${task.id}/comments`, { method: 'POST', cookie: owner.cookie, body: { body: '   ' } })).status, 400);
  assert.equal((await f.request(`/api/tasks/${task.id}/comments`, { method: 'POST', cookie: owner.cookie, body: { body: 'x'.repeat(1001) } })).status, 400);
});
