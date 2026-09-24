import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskApi } from '../../../frontend/src/features/tasks/taskApi.js';
import { initialTaskFields, prepareTaskPayload } from '../../../frontend/src/features/tasks/taskFormModel.js';

test('Formular bewahrt UTC-Termin und sendet bei Bearbeitung keine unveränderlichen Felder', () => {
  const task = { title: 'Üben', description: '', dueAt: '2026-09-25T14:12:13.123Z', importance: 2, difficulty: 3, effortHours: 0.5, status: 'done', groupId: 'group', ownerId: 'alice' };
  const { payload, fields } = prepareTaskPayload(initialTaskFields(task), task);
  assert.deepEqual(fields, {}); assert.equal(payload.dueAt, task.dueAt);
  assert.ok(!('groupId' in payload)); assert.ok(!('ownerId' in payload)); assert.equal(payload.status, 'done');
});

test('Formularvalidierung erkennt leere Werte, ungültige Zahl und unmögliches Datum', () => {
  const values = { ...initialTaskFields(), dueAt: '2026-02-30T12:00', effortHours: '' };
  const { fields } = prepareTaskPayload(values);
  assert.ok(fields.title); assert.ok(fields.effortHours); assert.ok(fields.dueAt);
});

test('API-Adapter nutzt Jaouads Funktionsvertrag einschließlich DELETE-Methode', async () => {
  const calls = [];
  const client = createTaskApi(async (path, options) => { calls.push([path, options]); return { id: 'saved' }; });
  assert.equal((await client.create({ title: 'x' })).id, 'saved');
  await client.get('a/b'); await client.update('x', { status: 'done' }); await client.remove('x');
  assert.deepEqual(calls, [
    ['/tasks', { method: 'POST', body: { title: 'x' } }], ['/tasks/a%2Fb', { method: 'GET' }],
    ['/tasks/x', { method: 'PATCH', body: { status: 'done' } }], ['/tasks/x', { method: 'DELETE', body: {} }]
  ]);
});

test('Vorgeschlagener api.get/post-Vertrag erhält Kontext und Fehlerobjekt', async () => {
  const error = Object.assign(new Error('Ungültig'), { status: 400, fields: { title: 'Fehlt' } });
  const api = { value: 'ok', get() { return this.value; }, post() { throw error; } };
  const client = createTaskApi(api);
  assert.equal(await client.list(), 'ok');
  assert.throws(() => client.create({}), candidate => candidate === error);
});
