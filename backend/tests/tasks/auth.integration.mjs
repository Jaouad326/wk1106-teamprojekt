// Separater Integrationstest gegen Jaouads unveränderte Auth-Dateien.
// TASK_AUTH_ROOT bezeichnet einen Checkout seines Branches bzw. nach Merge das Projekt.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { createFixture, validTask } from './fixture.js';
import { createTaskRouter } from '../../src/modules/tasks/taskRoutes.js';

if (!process.env.TASK_AUTH_ROOT) throw new Error('TASK_AUTH_ROOT muss auf den Checkout mit Jaouads Auth-Modul zeigen.');
const auth = file => import(pathToFileURL(path.resolve(process.env.TASK_AUTH_ROOT, 'backend/src/modules/auth', file)));
const [{ up }, { createAuthRepository }, { createAuthService }, { createSessionService }, routes, { AuthError }] = await Promise.all([
  auth('authMigration.js'), auth('authRepository.js'), auth('authService.js'), auth('sessionService.js'), auth('authRoutes.js'), auth('authError.js')
]);

test('Echte Auth-Module: Login → Aufgaben-CRUD → fremde Sitzung → Logout; CSRF greift', async t => {
  const f = await createFixture(); t.after(() => f.close());
  const db = await f.openDb(); await up(db); await db.close();
  const sent = [];
  const appOrigin = 'http://localhost:5173';
  const repository = createAuthRepository({ openDb: f.openDb });
  const service = createAuthService({ repository, mailer: { async sendLoginLink(message) { sent.push(message); } }, allowedDomains: ['campus.example'], appOrigin });
  const sessions = createSessionService({ repository, secure: false });
  const app = express();
  app.use('/api', routes.protectWrites(appOrigin));
  app.use(express.json());
  app.use('/api/auth', routes.createAuthRouter({ service, repository, sessions, localMail: true }));
  app.use('/api/tasks', createTaskRouter({ taskService: f.service, requireAuth: routes.createRequireAuth(sessions) }));
  app.use((error, req, res, next) => {
    if (error instanceof AuthError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Fehler.' } });
  });
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  async function request(method, route, body, cookie, extraHeaders = {}) {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, { method, headers: {
      origin: appOrigin, 'Content-Type': 'application/json', 'X-StudyPrio-Request': '1', ...(cookie ? { cookie } : {}), ...extraHeaders
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: res.status, cookie: res.headers.get('set-cookie')?.split(';')[0], body: res.status === 204 ? null : await res.json() };
  }
  async function login(email) {
    assert.equal((await request('POST', '/auth/request-link', { email })).status, 202);
    const token = new URLSearchParams(new URL(sent.at(-1).url).hash.slice(1)).get('token');
    const verified = await request('POST', '/auth/verify', { token });
    assert.equal(verified.status, 200); return verified;
  }
  assert.equal((await request('GET', '/tasks')).status, 401);
  assert.equal((await request('GET', '/tasks', undefined, undefined, { 'X-User-Id': 'alice' })).status, 401);
  const alice = await login('alice@campus.example');
  const created = await request('POST', '/tasks', validTask(), alice.cookie);
  assert.equal(created.status, 201); assert.equal(created.body.data.ownerId, alice.body.data.id);
  const id = created.body.data.id;
  assert.equal((await request('PATCH', `/tasks/${id}`, { status: 'done' }, alice.cookie)).body.data.status, 'done');
  assert.equal((await request('GET', `/tasks/${id}`, undefined, alice.cookie)).status, 200);
  assert.equal((await request('DELETE', `/tasks/${id}`, {}, alice.cookie, { origin: 'https://foreign.example' })).status, 403);
  assert.equal((await request('POST', '/tasks', validTask(), alice.cookie, { 'X-StudyPrio-Request': '' })).status, 403);
  const bob = await login('bob@campus.example');
  assert.deepEqual((await request('GET', '/tasks', undefined, bob.cookie)).body.data, []);
  assert.equal((await request('GET', `/tasks/${id}`, undefined, bob.cookie)).status, 403);
  assert.equal((await request('DELETE', `/tasks/${id}`, {}, alice.cookie)).status, 200);
  assert.equal((await request('POST', '/auth/logout', {}, alice.cookie)).status, 204);
  assert.equal((await request('GET', '/tasks', undefined, alice.cookie)).status, 401);
});
