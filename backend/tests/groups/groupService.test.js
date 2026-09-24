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
import { createGroupService } from '../../src/modules/groups/groupService.js';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'studyprio-groups-'));
  const openDb = async () => {
    const db = await open({ filename: join(directory, 'groups.sqlite'), driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON;');
    return db;
  };
  t.after(() => rm(directory, { recursive: true, force: true }));
  const db = await openDb();
  await authMigration(db); await groupMigration(db);
  const owner = randomUUID();
  const invitee = randomUUID();
  const stranger = randomUUID();
  const users = { [`owner@campus.example`]: { id: owner, email: 'owner@campus.example' },
    [`invitee@campus.example`]: { id: invitee, email: 'invitee@campus.example' } };
  for (const id of [owner, invitee, stranger]) {
    await db.run('INSERT INTO users (id, email, emailVerifiedAt, createdAt) VALUES (?, ?, ?, ?)', [id, `${id}@campus.example`, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z']);
  }
  await db.close();
  const userDirectory = { async findVerifiedByEmail(email) { return users[email] ?? null; } };
  const service = createGroupService({ openDb, userDirectory });
  return { service, owner, invitee, stranger };
}

test('UC-G1: creating a group makes the creator owner and member', async t => {
  const f = await fixture(t);
  const group = await f.service.createGroup(f.owner, 'Lerngruppe');
  assert.equal(group.ownerId, f.owner);
  assert.deepEqual((await f.service.listGroups(f.owner)).map(g => g.id), [group.id]);
  const members = await f.service.listMembers(f.owner, group.id);
  assert.deepEqual(members.map(member => member.userId), [f.owner]);
});

test('UC-G2: only the owner may add members, and only confirmed accounts can be added', async t => {
  const f = await fixture(t);
  const group = await f.service.createGroup(f.owner, 'Lerngruppe');
  await assert.rejects(f.service.addMember(f.invitee, group.id, 'invitee@campus.example'), error => error.code === 'FORBIDDEN');
  await assert.rejects(f.service.addMember(f.owner, group.id, 'unknown@campus.example'), error => error.code === 'NOT_FOUND');
  const added = await f.service.addMember(f.owner, group.id, 'invitee@campus.example');
  assert.equal(added.userId, f.invitee);
  await assert.rejects(f.service.addMember(f.owner, group.id, 'invitee@campus.example'), error => error.code === 'CONFLICT');
});

test('UC-G3: owner cannot remove themselves; removing a member revokes group task access', async t => {
  const f = await fixture(t);
  const group = await f.service.createGroup(f.owner, 'Lerngruppe');
  await f.service.addMember(f.owner, group.id, 'invitee@campus.example');
  await assert.rejects(f.service.removeMember(f.owner, group.id, f.owner), error => error.code === 'BAD_REQUEST');
  await f.service.removeMember(f.owner, group.id, f.invitee);
  const members = await f.service.listMembers(f.owner, group.id);
  assert.deepEqual(members.map(member => member.userId), [f.owner]);
});

test('UC-G4/G5: non-members cannot list groups they are not part of or view members', async t => {
  const f = await fixture(t);
  const group = await f.service.createGroup(f.owner, 'Lerngruppe');
  assert.deepEqual(await f.service.listGroups(f.stranger), []);
  await assert.rejects(f.service.listMembers(f.stranger, group.id), error => error.code === 'FORBIDDEN');
});
