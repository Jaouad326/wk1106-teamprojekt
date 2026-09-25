import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teamFixture } from '../integration/teamFixture.mjs';
const input = { title: 'Gemeinsame Aufgabe', dueAt: '2026-12-01T12:00:00Z', importance: 3, difficulty: 2, effortHours: 1 };

test('Beitritt braucht Zustimmung, auch über den bisherigen members-Endpunkt', async t => {
  const f = await teamFixture(); t.after(() => f.close());
  const owner = await f.login('owner@campus.example');
  const member = await f.login('member@campus.example');
  const stranger = await f.login('stranger@campus.example');
  const group = (await f.request('POST', '/groups', { name: 'Zustimmung' }, owner.cookie)).data;
  const invitation = await f.request('POST', `/groups/${group.id}/members`, { email: member.data.email }, owner.cookie);
  assert.equal(invitation.status, 201); assert.equal(invitation.data.status, 'pending');
  assert.deepEqual((await f.request('GET', '/groups', undefined, member.cookie)).data, []);
  assert.equal((await f.request('GET', `/groups/${group.id}/members`, undefined, member.cookie)).status, 403);
  const path = `/groups/invitations/${invitation.data.id}`;
  assert.equal((await f.request('POST', `${path}/accept`, {}, stranger.cookie)).status, 404);
  assert.equal((await f.request('POST', `${path}/decline`, {}, member.cookie)).status, 200);
  assert.deepEqual((await f.request('GET', '/groups/invitations', undefined, member.cookie)).data, []);
  assert.deepEqual((await f.request('GET', '/groups', undefined, member.cookie)).data, []);
});

test('Gruppenleitung übergeben und letzte Gruppe verlassen erhält Aufgaben und Kommentare', async t => {
  const f = await teamFixture(); t.after(() => f.close());
  const owner = await f.login('owner@campus.example');
  const member = await f.login('member@campus.example');
  const group = (await f.request('POST', '/groups', { name: 'Übergabe' }, owner.cookie)).data;
  const task = (await f.request('POST', '/tasks', { ...input, groupId: group.id }, owner.cookie)).data;
  await f.request('POST', `/tasks/${task.id}/comments`, { body: 'Bleibt erhalten' }, owner.cookie);
  const invite = (await f.request('POST', `/groups/${group.id}/invitations`, { email: member.data.email }, owner.cookie)).data;
  assert.equal((await f.request('POST', `/groups/invitations/${invite.id}/accept`, {}, member.cookie)).status, 200);
  assert.equal((await f.request('DELETE', `/groups/${group.id}/membership`, { successorId: 'unknown' }, owner.cookie)).status, 400);
  assert.equal((await f.request('DELETE', `/groups/${group.id}/membership`, { successorId: member.data.id }, owner.cookie)).status, 200);
  assert.equal((await f.request('GET', '/groups', undefined, member.cookie)).data[0].ownerId, member.data.id);
  assert.equal((await f.request('GET', `/tasks/${task.id}`, undefined, owner.cookie)).status, 403);
  const left = await f.request('DELETE', `/groups/${group.id}/membership`, {}, member.cookie);
  assert.equal(left.status, 200); assert.equal(left.data.dissolved, true);
  const kept = (await f.request('GET', `/tasks/${task.id}`, undefined, member.cookie)).data;
  assert.equal(kept.groupId, null); assert.equal(kept.ownerId, member.data.id);
  assert.equal((await f.request('GET', `/tasks/${task.id}/comments`, undefined, member.cookie)).data[0].body, 'Bleibt erhalten');
  const db = await f.openDb();
  try { assert.deepEqual(await db.all('PRAGMA foreign_key_check'), []); } finally { await db.close(); }
});

test('Gleichzeitige Einladungen und Antworten erzeugen keine doppelte oder widersprüchliche Mitgliedschaft', async t => {
  const f = await teamFixture(); t.after(() => f.close());
  const owner = await f.login('owner@campus.example'); const member = await f.login('member@campus.example');
  const group = (await f.request('POST', '/groups', { name: 'Parallel' }, owner.cookie)).data;
  const invites = await Promise.all([1, 2].map(() => f.request('POST', `/groups/${group.id}/invitations`, { email: member.data.email }, owner.cookie)));
  assert.deepEqual(invites.map(r => r.status).sort(), [201, 409]);
  const invitation = invites.find(r => r.status === 201).data;
  const results = await Promise.all(['accept', 'decline'].map(action => f.request('POST', `/groups/invitations/${invitation.id}/${action}`, {}, member.cookie)));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const accepted = results[0].status === 200;
  assert.equal((await f.request('GET', '/groups', undefined, member.cookie)).data.length, accepted ? 1 : 0);
});
