import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
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
import { createGroupRouter } from '../../src/modules/groups/groupRoutes.js';

async function fixture(t) {
  const directory = await mkdtemp(
    join(tmpdir(), 'studyprio-group-http-')
  );

  const openDb = async () => {
    const db = await open({
      filename: join(directory, 'test.sqlite'),
      driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON');
    return db;
  };

  const db = await openDb();

  await authMigration(db);
  await groupMigration(db);

  const owner = randomUUID();
  const invitee = randomUUID();

  await db.run(
    `INSERT INTO users
     (id, email, emailVerifiedAt, createdAt)
     VALUES (?, ?, ?, ?)`,
    [
      owner,
      'owner@campus.example',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    ]
  );

  await db.run(
    `INSERT INTO users
     (id, email, emailVerifiedAt, createdAt)
     VALUES (?, ?, ?, ?)`,
    [
      invitee,
      'invitee@campus.example',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    ]
  );

  await db.close();

  const userDirectory = {
    async findVerifiedByEmail(email) {
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

  const sessions = new Map();

  const requireAuth = (req, res, next) => {
    const userId = sessions.get(req.headers.cookie);

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Nicht angemeldet.'
        }
      });
    }

    req.user = { id: userId };
    next();
  };

  const app = express();

  app.use(express.json());

  app.use(
    '/api/groups',
    createGroupRouter({
      groupService,
      requireAuth,
      invitationService
    })
  );

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const url = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.closeAllConnections();

    await new Promise(resolve => {
      server.close(resolve);
    });

    await rm(directory, {
      recursive: true,
      force: true
    });
  });

  async function request(path, {
    method = 'GET',
    body,
    userId
  } = {}) {
    const response = await fetch(url + path, {
      method,
      headers: {
        ...(method !== 'GET'
          ? { 'content-type': 'application/json' }
          : {}),
        ...(userId
          ? { cookie: userId }
          : {})
      },
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {})
    });

    return {
      status: response.status,
      data: response.status === 204
        ? null
        : await response.json()
    };
  }

  return {
    request,
    sessions,
    owner,
    invitee
  };
}

test('HTTP: owner creates invitation and invitee accepts it', async t => {
  const f = await fixture(t);

  f.sessions.set(f.owner, f.owner);
  f.sessions.set(f.invitee, f.invitee);

  const group = await f.request('/api/groups', {
    method: 'POST',
    body: { name: 'Lerngruppe' },
    userId: f.owner
  });

  assert.equal(group.status, 201);

  const groupId = group.data.data.id;

  const invitation = await f.request(
    `/api/groups/${groupId}/invitations`,
    {
      method: 'POST',
      body: {
        email: 'invitee@campus.example'
      },
      userId: f.owner
    }
  );

  assert.equal(invitation.status, 201);
  assert.equal(
    invitation.data.data.groupId,
    groupId
  );
  assert.equal(
    invitation.data.data.status,
    'pending'
  );

  const invitations = await f.request(
    '/api/groups/invitations',
    {
      userId: f.invitee
    }
  );

  assert.equal(invitations.status, 200);
  assert.equal(invitations.data.data.length, 1);
  assert.equal(
    invitations.data.data[0].groupName,
    'Lerngruppe'
  );

  const accepted = await f.request(
    `/api/groups/invitations/${invitation.data.data.id}/accept`,
    {
      method: 'POST',
      body: {},
      userId: f.invitee
    }
  );

  assert.equal(accepted.status, 200);
  assert.equal(
    accepted.data.data.status,
    'accepted'
  );

  const members = await f.request(
    `/api/groups/${groupId}/members`,
    {
      userId: f.owner
    }
  );

  assert.equal(members.status, 200);
  assert.equal(members.data.data.length, 2);
});

test('HTTP: pending invitation does not grant group membership', async t => {
  const f = await fixture(t);

  f.sessions.set(f.owner, f.owner);
  f.sessions.set(f.invitee, f.invitee);

  const group = await f.request('/api/groups', {
    method: 'POST',
    body: { name: 'Lerngruppe' },
    userId: f.owner
  });

  const invitation = await f.request(
    `/api/groups/${group.data.data.id}/invitations`,
    {
      method: 'POST',
      body: {
        email: 'invitee@campus.example'
      },
      userId: f.owner
    }
  );

  assert.equal(invitation.status, 201);

  const members = await f.request(
    `/api/groups/${group.data.data.id}/members`,
    {
      userId: f.invitee
    }
  );

  assert.equal(members.status, 403);
});
test('HTTP: member can leave; last owner can dissolve group', async t => {
  const f = await fixture(t);

  f.sessions.set(f.owner, f.owner);
  f.sessions.set(f.invitee, f.invitee);

  const group = await f.request('/api/groups', {
    method: 'POST',
    body: { name: 'Lerngruppe' },
    userId: f.owner
  });

  assert.equal(group.status, 201);

  const groupId = group.data.data.id;

  const invitation = await f.request(
    `/api/groups/${groupId}/invitations`,
    {
      method: 'POST',
      body: {
        email: 'invitee@campus.example'
      },
      userId: f.owner
    }
  );

  assert.equal(invitation.status, 201);

  const accepted = await f.request(
    `/api/groups/invitations/${invitation.data.data.id}/accept`,
    {
      method: 'POST',
      body: {},
      userId: f.invitee
    }
  );

  assert.equal(accepted.status, 200);

  const left = await f.request(
    `/api/groups/${groupId}/membership`,
    {
      method: 'DELETE',
      userId: f.invitee
    }
  );

  assert.equal(left.status, 200);
  assert.equal(left.data.data.groupId, groupId);

  const groups = await f.request(
    '/api/groups',
    {
      userId: f.invitee
    }
  );

  assert.equal(groups.status, 200);
  assert.deepEqual(groups.data.data, []);

  const ownerLeave = await f.request(
    `/api/groups/${groupId}/membership`,
    {
      method: 'DELETE',
      userId: f.owner
    }
  );

  assert.equal(ownerLeave.status, 200);
  assert.equal(ownerLeave.data.data.dissolved, true);
});