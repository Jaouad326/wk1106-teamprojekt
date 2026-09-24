import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture, validTask } from './fixture.js';
import { createTaskRepository } from '../../src/modules/tasks/taskRepository.js';
import { createTaskService } from '../../src/modules/tasks/taskService.js';
import { up as migrateTasks } from '../../src/modules/tasks/taskMigration.js';

async function fixture(t) { const f = await createFixture(); t.after(() => f.close()); return f; }

test('CRUD: normalisiert UTC, setzt Eigentümer/Status, speichert Änderungen und löscht', async t => {
  const f = await fixture(t);
  const created = await f.request('POST', '', validTask({ title: '  Statistik üben  ' }));
  assert.equal(created.status, 201);
  const task = created.data;
  assert.equal(task.title, 'Statistik üben'); assert.equal(task.dueAt, '2026-09-25T14:00:00.000Z');
  assert.equal(task.ownerId, 'alice'); assert.equal(task.groupId, null); assert.equal(task.status, 'open');
  assert.match(task.id, /^[0-9a-f-]{36}$/); assert.equal(task.createdAt, task.updatedAt);
  assert.equal(created.headers.get('location'), `/api/tasks/${task.id}`);
  assert.deepEqual((await f.request('GET')).data, [task]);
  assert.deepEqual((await f.request('GET', `/${task.id}`)).data, task);
  const updated = await f.request('PATCH', `/${task.id}`, { title: 'Vortrag vorbereiten', status: 'in_progress' });
  assert.equal(updated.status, 200); assert.equal(updated.data.description, task.description);
  assert.equal(updated.data.ownerId, task.ownerId); assert.equal(updated.data.createdAt, task.createdAt);
  assert.equal((await f.request('PATCH', `/${task.id}`, { status: 'done' })).data.status, 'done');
  assert.equal((await f.request('GET', '?status=open')).data.length, 0);
  assert.equal((await f.request('GET', '?status=done')).data[0].id, task.id);
  assert.equal((await f.request('PATCH', `/${task.id}`, { status: 'open' })).data.status, 'open');
  assert.equal((await f.request('GET', '?status=open')).data[0].id, task.id);
  assert.equal((await f.request('DELETE', `/${task.id}`)).data.id, task.id);
  assert.equal((await f.request('GET', `/${task.id}`)).status, 404);
  assert.equal((await f.request('DELETE', `/${task.id}`)).status, 404);
});

test('Persistenz: neue Repository-/Service-Instanz liest dieselbe SQLite-Datei', async t => {
  const f = await fixture(t);
  const task = (await f.request('POST', '', validTask())).data;
  const reopened = createTaskService({ repository: createTaskRepository({ openDb: f.openDb }), accessService: f.accessService });
  assert.deepEqual(await reopened.getVisibleById('alice', task.id), task);
});

test('Unauthentifizierte HTTP-Aufrufe und direkte Service-Aufrufe werden abgewiesen', async t => {
  const f = await fixture(t); f.setUser(null);
  for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
    assert.equal((await f.request(method, ['PATCH', 'DELETE'].includes(method) ? '/missing' : '', method === 'GET' ? undefined : validTask())).status, 401);
  }
  await assert.rejects(f.service.listVisible(null), { status: 401 });
  await assert.rejects(f.service.getVisibleById('', 'missing'), { status: 401 });
});

test('Persönliche Aufgabe bleibt für fremden Benutzer unsichtbar und unveränderbar', async t => {
  const f = await fixture(t); const task = (await f.request('POST', '', validTask())).data;
  f.setUser('bob');
  assert.deepEqual((await f.request('GET')).data, []);
  for (const method of ['GET', 'PATCH', 'DELETE']) assert.equal((await f.request(method, `/${task.id}`, method === 'PATCH' ? { title: 'Fremde Änderung' } : undefined)).status, 403);
  await assert.rejects(f.service.getVisibleById('bob', task.id), { status: 403 });
  assert.deepEqual(await f.service.listVisible('bob'), []);
  assert.equal((await f.service.getVisibleById('alice', task.id)).title, task.title);
});

test('Gruppenmitglieder dürfen anlegen/bearbeiten/löschen; Nichtmitglieder nicht', async t => {
  const f = await fixture(t); const task = (await f.request('POST', '', validTask({ groupId: 'study-group' }))).data;
  f.setUser('outsider');
  assert.equal((await f.request('POST', '', validTask({ groupId: 'study-group' }))).status, 403);
  assert.equal((await f.request('POST', '', validTask({ groupId: 'unknown-group' }))).status, 403);
  assert.deepEqual((await f.request('GET')).data, []);
  for (const method of ['GET', 'PATCH', 'DELETE']) assert.equal((await f.request(method, `/${task.id}`, method === 'PATCH' ? { status: 'done' } : undefined)).status, 403);
  f.setUser('bob');
  assert.equal((await f.request('GET', `/${task.id}`)).status, 200);
  assert.equal((await f.request('PATCH', `/${task.id}`, { status: 'done' })).data.status, 'done');
  assert.equal((await f.request('DELETE', `/${task.id}`)).status, 200);
});

test('Entfernter Ersteller verliert auch als ownerId sämtliche Gruppenaufgabenrechte', async t => {
  const f = await fixture(t); const task = (await f.request('POST', '', validTask({ groupId: 'study-group' }))).data;
  const db = await f.openDb(); await db.run("DELETE FROM memberships WHERE userId = 'alice'"); await db.close();
  assert.deepEqual(await f.service.listVisible('alice'), []);
  await assert.rejects(f.service.getVisibleById('alice', task.id), { status: 403 });
  for (const method of ['GET', 'PATCH', 'DELETE']) assert.equal((await f.request(method, `/${task.id}`, method === 'PATCH' ? { status: 'done' } : undefined)).status, 403);
  assert.equal((await f.request('POST', '', validTask({ groupId: 'study-group' }))).status, 403);
});

test('Asynchrone Rechteprüfung wird abgewartet; Ausfälle erlauben keine Schreiboperation', async t => {
  const f = await fixture(t); const task = (await f.request('POST', '', validTask())).data;
  f.accessState.writeAllowed = false;
  assert.equal((await f.request('PATCH', `/${task.id}`, { title: 'Verboten' })).status, 403);
  f.accessState.writeAllowed = true;
  f.accessState.fail = true;
  const failed = await f.request('DELETE', `/${task.id}`);
  assert.equal(failed.status, 500); assert.equal(failed.error.message, 'Interner Fehler.');
  f.accessState.fail = false;
  assert.equal((await f.service.getVisibleById('alice', task.id)).title, task.title);
});

test('Unveränderliche und unbekannte Felder sowie leeres PATCH werden abgewiesen', async t => {
  const f = await fixture(t); const task = (await f.request('POST', '', validTask())).data;
  for (const body of [{ ownerId: 'bob' }, { groupId: 'study-group' }, { groupId: null }, { id: 'other' }, { createdAt: 'yesterday' }, { updatedAt: 'tomorrow' }, { priority: 100 }, {}]) {
    assert.equal((await f.request('PATCH', `/${task.id}`, body)).status, 400);
  }
  for (const body of [{ ownerId: 'bob' }, { id: 'fake' }, { status: 'done' }, { extra: true }]) assert.equal((await f.request('POST', '', validTask(body))).status, 400);
  const specialKey = JSON.parse(JSON.stringify(validTask()).replace(/}$/, ',"__proto__":"unexpected"}'));
  assert.equal((await f.request('POST', '', specialKey)).status, 400);
  assert.deepEqual((await f.request('GET', `/${task.id}`)).data, task);
});

const invalidValues = [
  ['title', ' '], ['title', 'x'.repeat(121)], ['title', 15], ['description', null], ['description', 'x'.repeat(2001)],
  ['importance', 0], ['importance', 6], ['importance', 1.5], ['importance', '3'], ['importance', true],
  ['difficulty', -1], ['difficulty', 6], ['difficulty', 2.2], ['difficulty', '2'],
  ['effortHours', 0], ['effortHours', 0.249], ['effortHours', 201], ['effortHours', '1.5'], ['effortHours', null],
  ['dueAt', '2026-02-30T12:00:00Z'], ['dueAt', '2025-02-29T12:00:00Z'], ['dueAt', '2026-13-01T00:00:00Z'],
  ['dueAt', '2026-09-25T24:00:00Z'], ['dueAt', '2026-09-25T12:00:00'], ['dueAt', '2026-09-25'],
  ['dueAt', '2026-09-25T12:00:00+25:00'], ['dueAt', '2026-09-25T12:61:00Z'], ['dueAt', 123],
  ['groupId', ''], ['groupId', 4], ['groupId', {}]
];
test('Servervalidierung: Typen, Bereiche und echte Kalenderdaten', async t => {
  const f = await fixture(t);
  for (const [field, value] of invalidValues) {
    const response = await f.request('POST', '', validTask({ [field]: value }));
    assert.equal(response.status, 400, `${field}: ${JSON.stringify(value)}`);
    assert.ok(response.error.fields[field]);
  }
  for (const body of [null, [], {}, { title: 'Unvollständig' }]) assert.equal((await f.request('POST', '', body)).status, 400);
  for (const value of [NaN, Infinity, -Infinity]) await assert.rejects(f.service.create('alice', validTask({ effortHours: value })), { status: 400 });
  assert.deepEqual((await f.request('GET')).data, []);
});

test('Grenzwerte, Vergangenheit und Schaltjahr sind erlaubt', async t => {
  const f = await fixture(t);
  for (const body of [validTask({ dueAt: '2024-02-29T01:30:00+01:00', importance: 1, difficulty: 5, effortHours: 0.25 }), validTask({ title: 'x'.repeat(120), description: 'x'.repeat(2000), effortHours: 200 })]) assert.equal((await f.request('POST', '', body)).status, 201);
});

test('PATCH prüft Fachfelder genauso streng und erhält gespeicherte Daten bei Fehlern', async t => {
  const f = await fixture(t); const task = (await f.request('POST', '', validTask())).data;
  for (const [field, value] of invalidValues.filter(([field]) => field !== 'groupId')) assert.equal((await f.request('PATCH', `/${task.id}`, { [field]: value })).status, 400);
  assert.equal((await f.request('PATCH', `/${task.id}`, { status: 'archived' })).status, 400);
  assert.deepEqual((await f.request('GET', `/${task.id}`)).data, task);
});

test('SQL-Parameter behandeln Sonderzeichen als Text', async t => {
  const f = await fixture(t); const title = "'); DROP TABLE tasks; --";
  const task = (await f.request('POST', '', validTask({ title }))).data;
  assert.equal((await f.request('GET', `/${task.id}`)).data.title, title);
  assert.equal((await f.request('GET', '/%27%20OR%201%3D1')).status, 404);
});

test('Task-Löschung kaskadiert nur die zugehörigen Kommentare; FK aktiv in jeder Verbindung', async t => {
  const f = await fixture(t);
  const a = await f.service.create('alice', validTask()), b = await f.service.create('alice', validTask());
  const db = await f.openDb();
  for (const task of [a, b]) await db.run('INSERT INTO comments VALUES (?, ?, ?, ?, ?)', [task.id, task.id, 'alice', 'Testkommentar', '2026-09-23T12:00:00Z']);
  await db.close();
  await f.service.remove('alice', a.id);
  const check = await f.openDb();
  assert.deepEqual((await check.all('SELECT taskId FROM comments')).map(c => c.taskId), [b.id]);
  await assert.rejects(check.run('INSERT INTO comments VALUES (?, ?, ?, ?, ?)', ['orphan', 'missing', 'alice', 'x', '2026-09-23T12:00:00Z']));
  assert.deepEqual(await check.all('PRAGMA foreign_key_check'), []);
  await check.close();
});

test('Migration wiederholbar; keine Eigentümer-/Gruppen-Datensätze ohne gültige Referenz', async t => {
  const f = await fixture(t); const task = await f.service.create('alice', validTask({ groupId: 'study-group' }));
  const db = await f.openDb(); await migrateTasks(db); await migrateTasks(db);
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM tasks')).count, 1);
  await assert.rejects(db.run('UPDATE tasks SET ownerId = ? WHERE id = ?', ['missing', task.id]));
  await assert.rejects(db.run('UPDATE tasks SET groupId = ? WHERE id = ?', ['missing', task.id]));
  await db.run("DELETE FROM memberships WHERE groupId = 'study-group'");
  await assert.rejects(db.run("DELETE FROM groups WHERE id = 'study-group'"));
  await assert.rejects(db.run('UPDATE tasks SET difficulty = 1.5 WHERE id = ?', [task.id]));
  await db.close();
});

test('Migration lehnt fehlende Fremdtabellen oder deaktivierte Foreign Keys verständlich ab', async t => {
  const f = await fixture(t); const db = await f.openDb();
  await db.exec('PRAGMA foreign_keys = OFF');
  await assert.rejects(migrateTasks(db), /foreign_keys/);
  await db.exec('DROP TABLE tasks; DROP TABLE groups; PRAGMA foreign_keys = ON;');
  await assert.rejects(migrateTasks(db), /groups-Migration/);
  await db.close();
});

test('Ungültige/mehrfache Filter und fehlerhaftes JSON liefern 400', async t => {
  const f = await fixture(t);
  for (const query of ['?status=invalid', '?status=open&status=done', '?ownerId=bob']) assert.equal((await f.request('GET', query)).status, 400);
  const response = await fetch(`${f.origin}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(response.status, 400);
});

test('Parallele PATCHes erhalten unabhängige Feldänderungen durch Schreibtransaktion', async t => {
  const f = await fixture(t); const task = await f.service.create('alice', validTask());
  await Promise.all([f.service.update('alice', task.id, { title: 'Neuer Titel' }), f.service.update('alice', task.id, { status: 'done' })]);
  const saved = await f.service.getVisibleById('alice', task.id);
  assert.equal(saved.title, 'Neuer Titel'); assert.equal(saved.status, 'done');
});
