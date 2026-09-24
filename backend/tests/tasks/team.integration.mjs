import test from 'node:test';
import assert from 'node:assert/strict';
import { createTeamFixture } from './teamFixture.mjs';
import { validTask } from './fixture.js';

async function fixture(t) { const f = await createTeamFixture(); t.after(() => f.close()); return f; }

test('Team: echte Anmeldung → Gruppe/Mitgliedschaft → Gruppenaufgabe → Rechteentzug', async t => {
  const f = await fixture(t);
  const alice = await f.login('alice@campus.example'), bob = await f.login('bob@campus.example'), outsider = await f.login('outsider@campus.example');
  const createdGroup = await f.request('POST', '/groups', { name: 'Projektgruppe' }, alice.cookie);
  assert.equal(createdGroup.status, 201);
  const groupId = createdGroup.data.id;
  assert.equal((await f.request('POST', `/groups/${groupId}/members`, { email: 'bob@campus.example' }, alice.cookie)).status, 201);
  assert.equal((await f.request('GET', '/groups', undefined, bob.cookie)).data[0].id, groupId);
  const task = await f.request('POST', '/tasks', validTask({ groupId }), bob.cookie);
  assert.equal(task.status, 201); assert.equal(task.data.ownerId, bob.user.id);
  const id = task.data.id;
  assert.equal((await f.request('PATCH', `/tasks/${id}`, { status: 'in_progress' }, alice.cookie)).status, 200);
  assert.equal((await f.request('GET', `/tasks/${id}`, undefined, outsider.cookie)).status, 403);
  assert.equal((await f.request('POST', '/tasks', validTask({ groupId }), outsider.cookie)).status, 403);
  assert.deepEqual((await f.request('GET', '/tasks', undefined, outsider.cookie)).data, []);
  assert.equal((await f.request('DELETE', `/groups/${groupId}/members/${bob.user.id}`, {}, alice.cookie)).status, 204);
  assert.deepEqual((await f.request('GET', '/groups', undefined, bob.cookie)).data, []);
  assert.deepEqual((await f.request('GET', '/tasks', undefined, bob.cookie)).data, []);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    assert.equal((await f.request(method, `/tasks/${id}`, method === 'GET' ? undefined : { status: 'done' }, bob.cookie)).status, 403);
  }
  await assert.rejects(f.taskService.getVisibleById(bob.user.id, id), { status: 403 });
  assert.deepEqual(await f.taskService.listVisible(bob.user.id), []);
  assert.equal((await f.request('DELETE', `/tasks/${id}`, {}, alice.cookie)).status, 200);
});

test('Team: persönliche Tasks bleiben privat, echte Sitzungen/CSRF und Migration erhalten Daten', async t => {
  const f = await fixture(t); const alice = await f.login('alice@campus.example'), bob = await f.login('bob@campus.example');
  const created = await f.request('POST', '/tasks', validTask(), alice.cookie);
  assert.equal(created.status, 201); const task = created.data;
  const db = await f.openDb(); await f.migrate(db); await f.migrate(db);
  assert.deepEqual(await db.all('PRAGMA foreign_key_check'), []); await db.close();
  assert.deepEqual((await f.request('GET', `/tasks/${task.id}`, undefined, alice.cookie)).data, task);
  assert.equal((await f.request('GET', `/tasks/${task.id}`, undefined, bob.cookie)).status, 403);
  assert.equal((await f.request('GET', '/tasks', undefined, undefined, { 'X-User-Id': alice.user.id })).status, 401);
  assert.equal((await f.request('DELETE', `/tasks/${task.id}`, {}, alice.cookie, { origin: 'https://fremd.example' })).status, 403);
  assert.equal((await f.request('POST', '/auth/logout', {}, alice.cookie)).status, 204);
  assert.equal((await f.request('GET', '/tasks', undefined, alice.cookie)).status, 401);
});

test('Team: Gruppenbesitzer bleibt Mitglied; bestehendes Kommentarschema kaskadiert', async t => {
  const f = await fixture(t); const alice = await f.login('alice@campus.example');
  const group = (await f.request('POST', '/groups', { name: 'Seminar' }, alice.cookie)).data;
  assert.equal((await f.request('DELETE', `/groups/${group.id}/members/${alice.user.id}`, {}, alice.cookie)).status, 400);
  const task = (await f.request('POST', '/tasks', validTask({ groupId: group.id }), alice.cookie)).data;
  const db = await f.openDb();
  await db.run('INSERT INTO comments VALUES (?, ?, ?, ?, ?)', ['test-comment', task.id, alice.user.id, 'Fiktiver Kommentar', '2026-09-24T00:00:00.000Z']);
  await db.close();
  assert.equal((await f.request('DELETE', `/tasks/${task.id}`, {}, alice.cookie)).status, 200);
  const check = await f.openDb();
  assert.equal((await check.get('SELECT count(*) AS count FROM comments')).count, 0);
  assert.deepEqual(await check.all('PRAGMA foreign_key_check'), []); await check.close();
});

test('Team: parallele Aufgabenänderungen mit echtem AccessService erhalten Felder', async t => {
  const f = await fixture(t); const alice = await f.login('alice@campus.example');
  const group = (await f.request('POST', '/groups', { name: 'Gruppe' }, alice.cookie)).data;
  const task = (await f.request('POST', '/tasks', validTask({ groupId: group.id }), alice.cookie)).data;
  const responses = await Promise.all([
    f.request('PATCH', `/tasks/${task.id}`, { title: 'Aktualisiert' }, alice.cookie),
    f.request('PATCH', `/tasks/${task.id}`, { status: 'done' }, alice.cookie)
  ]);
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  const saved = await f.taskService.getVisibleById(alice.user.id, task.id);
  assert.equal(saved.title, 'Aktualisiert'); assert.equal(saved.status, 'done');
});
