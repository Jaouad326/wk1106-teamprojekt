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
import { createGroupInvitationService } from '../../src/modules/groups/groupInvitationService.js';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'studyprio-invitations-'));

  const openDb = async () => {
    const db = await open({
      filename: join(directory, 'groups.sqlite'),
      driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON;');
    return db;
  };

  t.after(() => rm(directory, { recursive: true, force: true }));

  const db = await openDb();

  await authMigration(db);
  await groupMigration(db);

  const owner = randomUUID();
  const invitee = randomUUID();
  const stranger = randomUUID();

  const users = {
    'owner@campus.example': {
      id: owner,
      email: 'owner@campus.example'
    },
    'invitee@campus.example': {
      id: invitee,
      email: 'invitee@campus.example'
    }
  };

  for (const id of [owner, invitee, stranger]) {
    await db.run(
      `INSERT INTO users
       (id, email, emailVerifiedAt, createdAt)
       VALUES (?, ?, ?, ?)`,
      [
        id,
        `${id}@campus.example`,
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z'
      ]
    );
  }

  await db.close();

  const userDirectory = {
    async findVerifiedByEmail(email) {
      return users[email] ?? null;
    }
  };

  const groupService = createGroupService({
    openDb,
    userDirectory
  });

  const invitationService = createGroupInvitationService({
    openDb,
    userDirectory
  });

  return {
    groupService,
    invitationService,
    openDb,
    owner,
    invitee,
    stranger
  };
}

test('UC-G6: owner can create a pending group invitation', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  const invitation = await f.invitationService.createInvitation(
    f.owner,
    group.id,
    'invitee@campus.example'
  );

  assert.equal(invitation.groupId, group.id);
  assert.equal(invitation.invitedUserId, f.invitee);
  assert.equal(invitation.status, 'pending');
  assert.ok(invitation.id);
  assert.ok(invitation.createdAt);
});

test('UC-G6: only the group owner may create an invitation', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  await assert.rejects(
    f.invitationService.createInvitation(
      f.invitee,
      group.id,
      'invitee@campus.example'
    ),
    error => error.code === 'FORBIDDEN'
  );
});

test('UC-G6: only confirmed accounts can be invited', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  await assert.rejects(
    f.invitationService.createInvitation(
      f.owner,
      group.id,
      'unknown@campus.example'
    ),
    error => error.code === 'NOT_FOUND'
  );
});

test('UC-G6: a second pending invitation for the same user is rejected', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  await f.invitationService.createInvitation(
    f.owner,
    group.id,
    'invitee@campus.example'
  );

  await assert.rejects(
    f.invitationService.createInvitation(
      f.owner,
      group.id,
      'invitee@campus.example'
    ),
    error => error.code === 'CONFLICT'
  );
});

test('UC-G7: invited user can see their pending invitation', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  const invitation = await f.invitationService.createInvitation(
    f.owner,
    group.id,
    'invitee@campus.example'
  );

  const invitations = await f.invitationService.listInvitations(
    f.invitee
  );

  assert.equal(invitations.length, 1);
  assert.equal(invitations[0].id, invitation.id);
  assert.equal(invitations[0].groupId, group.id);
  assert.equal(invitations[0].groupName, 'Lerngruppe');
  assert.equal(invitations[0].status, 'pending');
});

test('UC-G7: pending invitation does not create group membership', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  await f.invitationService.createInvitation(
    f.owner,
    group.id,
    'invitee@campus.example'
  );

  const members = await f.groupService.listMembers(
    f.owner,
    group.id
  );

  assert.deepEqual(
    members.map(member => member.userId),
    [f.owner]
  );
});

test('UC-G8: accepting an invitation creates group membership', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  const invitation = await f.invitationService.createInvitation(
    f.owner,
    group.id,
    'invitee@campus.example'
  );

  const accepted = await f.invitationService.acceptInvitation(
    f.invitee,
    invitation.id
  );

  assert.equal(accepted.status, 'accepted');
  assert.ok(accepted.respondedAt);

  const members = await f.groupService.listMembers(
    f.owner,
    group.id
  );

 assert.deepEqual(
  members.map(member => member.userId).sort(),
  [f.owner, f.invitee].sort()
);
});

test('UC-G8: an invitation can only be accepted by the invited user', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  const invitation = await f.invitationService.createInvitation(
    f.owner,
    group.id,
    'invitee@campus.example'
  );

  await assert.rejects(
    f.invitationService.acceptInvitation(
      f.stranger,
      invitation.id
    ),
    error => error.code === 'NOT_FOUND'
  );
});

test('UC-G9: declining an invitation does not create membership', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  const invitation = await f.invitationService.createInvitation(
    f.owner,
    group.id,
    'invitee@campus.example'
  );

  const declined = await f.invitationService.declineInvitation(
    f.invitee,
    invitation.id
  );

  assert.equal(declined.status, 'declined');
  assert.ok(declined.respondedAt);

  const members = await f.groupService.listMembers(
    f.owner,
    group.id
  );

  assert.deepEqual(
    members.map(member => member.userId),
    [f.owner]
  );
});

test('UC-G8/G9: answered invitations cannot be answered again', async t => {
  const f = await fixture(t);

  const group = await f.groupService.createGroup(
    f.owner,
    'Lerngruppe'
  );

  const invitation = await f.invitationService.createInvitation(
    f.owner,
    group.id,
    'invitee@campus.example'
  );

  await f.invitationService.acceptInvitation(
    f.invitee,
    invitation.id
  );

  await assert.rejects(
    f.invitationService.declineInvitation(
      f.invitee,
      invitation.id
    ),
    error => error.code === 'CONFLICT'
  );
});