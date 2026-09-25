import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teamFixture } from './teamFixture.mjs';

const taskInput = { title: 'Integration prüfen', dueAt: '2026-09-25T15:00:00Z', importance: 3, difficulty: 2, effortHours: 1 };

test('Gemeinsame App: Anmeldung, Gruppenmitgliedschaft, Aufgabenrechte und Logout', async t => {
  const f = await teamFixture(); t.after(() => f.close());
  assert.equal((await f.request('GET', '/tasks')).status, 401);
  const owner = await f.login('owner@campus.example');
  const member = await f.login('member@campus.example');
  const outsider = await f.login('outsider@campus.example');
  const group = await f.request('POST', '/groups', { name: 'Testteam' }, owner.cookie);
  assert.equal(group.status, 201);
  // Keine bestätigte Adresse im Verzeichnis: verständlicher 404 statt Gruppen-500.
  assert.equal((await f.request('POST', `/groups/${group.data.id}/members`, { email: 'x@not-allowed.example' }, owner.cookie)).status, 404);
  const invitation = await f.request('POST', `/groups/${group.data.id}/invitations`, { email: member.data.email }, owner.cookie);
  assert.equal(invitation.status, 201);
  assert.equal((await f.request('POST', `/groups/invitations/${invitation.data.id}/accept`, {}, member.cookie)).status, 200);
  const task = await f.request('POST', '/tasks', { ...taskInput, groupId: group.data.id }, member.cookie);
  assert.equal(task.status, 201);
  assert.equal((await f.request('GET', `/tasks/${task.data.id}`, undefined, outsider.cookie)).status, 403);
  assert.equal((await f.request('PATCH', `/tasks/${task.data.id}`, { status: 'done' }, owner.cookie)).status, 200);
  const commentsPath = `/tasks/${task.data.id}/comments`;
  assert.equal((await f.request('POST', commentsPath, { body: 'Gemeinsam prüfen' }, member.cookie)).status, 201);
  assert.equal((await f.request('GET', commentsPath, undefined, owner.cookie)).data[0].body, 'Gemeinsam prüfen');
  assert.equal((await f.request('GET', commentsPath, undefined, outsider.cookie)).status, 403);
  assert.equal((await f.request('DELETE', `/groups/${group.data.id}/members/${member.data.id}`, {}, owner.cookie)).status, 204);
  assert.equal((await f.request('GET', `/tasks/${task.data.id}`, undefined, member.cookie)).status, 403);
  assert.equal((await f.request('PATCH', `/tasks/${task.data.id}`, { title: 'Verboten' }, member.cookie)).status, 403);
  assert.equal((await f.request('GET', commentsPath, undefined, member.cookie)).status, 403);
  assert.equal((await f.request('POST', commentsPath, { body: 'Verboten' }, member.cookie)).status, 403);
  assert.equal((await f.request('DELETE', `/tasks/${task.data.id}`, {}, owner.cookie)).status, 200);
  const db = await f.openDb();
  try { assert.equal((await db.get('SELECT COUNT(*) AS count FROM comments WHERE taskId = ?', task.data.id)).count, 0); }
  finally { await db.close(); }
  const privateTask = await f.request('POST', '/tasks', taskInput, member.cookie);
  assert.equal(privateTask.status, 201);
  assert.equal((await f.request('GET', `/tasks/${privateTask.data.id}`, undefined, owner.cookie)).status, 403);
  await f.request('POST', '/auth/logout', {}, owner.cookie);
  assert.equal((await f.request('GET', '/groups', undefined, owner.cookie)).status, 401);
  assert.equal((await f.request('GET', '/tasks', undefined, owner.cookie)).status, 401);
});

test('Gruppenservice hält parallele Transaktionen auf getrennten Verbindungen', async t => {
  const f = await teamFixture(); t.after(() => f.close());
  const owner = await f.login('owner@campus.example');
  const results = await Promise.all(['Eins', 'Zwei', 'Drei'].map(name => f.request('POST', '/groups', { name }, owner.cookie)));
  assert.deepEqual(results.map(r => r.status), [201, 201, 201]);
  const list = await f.request('GET', '/groups', undefined, owner.cookie);
  assert.equal(list.data.length, 3);
  const db = await f.openDb();
  try { assert.deepEqual(await db.all('PRAGMA foreign_key_check'), []); }
  finally { await db.close(); }
});
