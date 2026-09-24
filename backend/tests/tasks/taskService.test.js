import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { up as authMigration } from '../../src/modules/auth/authMigration.js';
import { up as groupMigration } from '../../src/modules/groups/groupMigration.js';
import { up as taskMigration } from '../../src/modules/tasks/taskMigration.js';
import { createAccessService } from '../../src/access/accessService.js';
import { createTaskRepository } from '../../src/modules/tasks/taskRepository.js';
import { createTaskService } from '../../src/modules/tasks/taskService.js';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'studyprio-tasks-'));
  const openDb = async () => {
    const db = await open({ filename: join(directory, 'tasks.sqlite'), driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON;');
    return db;
  };
  t.after(() => rm(directory, { recursive: true, force: true }));
  const db = await openDb();
  await authMigration(db); await groupMigration(db); await taskMigration(db);
  const owner = randomUUID();
  const member = randomUUID();
  const stranger = randomUUID();
  for (const id of [owner, member, stranger]) {
    await db.run('INSERT INTO users (id, email, emailVerifiedAt, createdAt) VALUES (?, ?, ?, ?)', [id, `${id}@campus.example`, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']);
  }
  const groupId = randomUUID();
  await db.run('INSERT INTO groups (id, name, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [groupId, 'Lerngruppe', owner, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']);
  await db.run('INSERT INTO group_members (groupId, userId) VALUES (?, ?)', [groupId, owner]);
  await db.run('INSERT INTO group_members (groupId, userId) VALUES (?, ?)', [groupId, member]);
  await db.close();

  let time = new Date('2026-09-24T12:00:00.000Z');
  const accessService = createAccessService({ openDb });
  const repository = createTaskRepository({ openDb });
  const service = createTaskService({ repository, accessService, now: () => time });
  const validInput = { title: 'Klausur vorbereiten', dueAt: '2026-10-01T10:00:00.000Z', importance: 4, difficulty: 3, effortHours: 5 };
  return { service, owner, member, stranger, groupId, validInput, advance: ms => { time = new Date(time.getTime() + ms); } };
}

test('TASK-03: create validates required fields and rejects unknown group membership', async t => {
  const f = await fixture(t);
  await assert.rejects(f.service.create(f.owner, { ...f.validInput, title: '' }), /Titel/);
  await assert.rejects(f.service.create(f.owner, { ...f.validInput, importance: 9 }), /Wichtigkeit/);
  await assert.rejects(f.service.create(f.owner, { ...f.validInput, dueAt: 'not-a-date' }), /Fälligkeit/);
  await assert.rejects(f.service.create(f.stranger, { ...f.validInput, groupId: f.groupId }), error => error.status === 403);
  const task = await f.service.create(f.owner, f.validInput);
  assert.equal(task.status, 'open');
  assert.equal(task.ownerId, f.owner);
  assert.equal(task.groupId, null);
  assert.ok(task.priority);
});

test('TASK-01/02: personal tasks are only visible to their owner', async t => {
  const f = await fixture(t);
  const task = await f.service.create(f.owner, f.validInput);
  assert.deepEqual((await f.service.list(f.owner)).map(item => item.id), [task.id]);
  assert.deepEqual(await f.service.list(f.stranger), []);
  await assert.rejects(f.service.get(f.stranger, task.id), error => error.status === 403);
  await assert.rejects(f.service.get(f.owner, randomUUID()), error => error.status === 404);
});

test('TASK-01/06: group tasks are visible to current members only', async t => {
  const f = await fixture(t);
  const task = await f.service.create(f.owner, { ...f.validInput, groupId: f.groupId });
  assert.deepEqual((await f.service.list(f.member)).map(item => item.id), [task.id]);
  assert.deepEqual(await f.service.list(f.stranger), []);
  const seenByMember = await f.service.get(f.member, task.id);
  assert.equal(seenByMember.groupId, f.groupId);
});

test('TASK-04/05: only current members may edit or delete a task; unknown fields are rejected', async t => {
  const f = await fixture(t);
  const task = await f.service.create(f.owner, { ...f.validInput, groupId: f.groupId });
  const updated = await f.service.update(f.member, task.id, { status: 'in_progress' });
  assert.equal(updated.status, 'in_progress');
  await assert.rejects(f.service.update(f.stranger, task.id, { status: 'done' }), error => error.status === 403);
  await assert.rejects(f.service.remove(f.stranger, task.id), error => error.status === 403);
  await f.service.remove(f.member, task.id);
  await assert.rejects(f.service.get(f.owner, task.id), error => error.status === 404);
});

test('priority: overdue and more important tasks rank higher and are marked overdue', async t => {
  const f = await fixture(t);
  const later = await f.service.create(f.owner, { ...f.validInput, title: 'Weit weg', importance: 1, dueAt: '2026-12-01T00:00:00.000Z' });
  const overdue = await f.service.create(f.owner, { ...f.validInput, title: 'Überfällig', importance: 5, dueAt: '2026-09-01T00:00:00.000Z' });
  assert.equal(overdue.priority.overdue, true);
  assert.equal(later.priority.overdue, false);
  const list = await f.service.list(f.owner);
  assert.equal(list[0].id, overdue.id);
  assert.ok(list[0].priority.score > list[1].priority.score);
  const done = await f.service.update(f.owner, later.id, { status: 'done' });
  assert.equal(done.priority.label, 'Erledigt');
});

test('TASK-01: status filter only returns matching tasks', async t => {
  const f = await fixture(t);
  await f.service.create(f.owner, { ...f.validInput, title: 'Offen' });
  const inProgress = await f.service.create(f.owner, { ...f.validInput, title: 'In Arbeit' });
  await f.service.update(f.owner, inProgress.id, { status: 'in_progress' });
  const filtered = await f.service.list(f.owner, 'in_progress');
  assert.deepEqual(filtered.map(task => task.id), [inProgress.id]);
});
