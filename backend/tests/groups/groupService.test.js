import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { createGroupService } from '../../src/modules/groups/groupService.js';

test('erstellt eine Gruppe und macht den Ersteller automatisch zum Mitglied', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail() {
      return null;
    }
  };

  const groupService = createGroupService(db, userDirectory);

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  assert.equal(group.name, 'Testgruppe');
  assert.equal(group.ownerId, 'test-user-1');

  const member = await db.get(
    `SELECT *
     FROM group_members
     WHERE groupId = ? AND userId = ?`,
    [group.id, 'test-user-1']
  );

  assert.ok(member);

  await db.close();
});

test('Owner kann ein bestätigtes Mitglied hinzufügen', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail(email) {
      if (email === 'mitglied@thm.de') {
        return {
          id: 'test-user-2',
          email: 'mitglied@thm.de'
        };
      }

      return null;
    }
  };

  const groupService = createGroupService(db, userDirectory);

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  const member = await groupService.addMember(
    'test-user-1',
    group.id,
    'mitglied@thm.de'
  );

  assert.equal(member.groupId, group.id);
  assert.equal(member.userId, 'test-user-2');

  const storedMember = await db.get(
    `SELECT *
     FROM group_members
     WHERE groupId = ? AND userId = ?`,
    [group.id, 'test-user-2']
  );

  assert.ok(storedMember);

  await db.close();
});
test('Nicht-Owner darf kein Mitglied hinzufügen', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail(email) {
      if (email === 'mitglied@thm.de') {
        return {
          id: 'test-user-2',
          email: 'mitglied@thm.de'
        };
      }

      return null;
    }
  };

  const groupService = createGroupService(db, userDirectory);

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  await assert.rejects(
    () =>
      groupService.addMember(
        'test-user-2',
        group.id,
        'mitglied@thm.de'
      ),
    {
      code: 'FORBIDDEN'
    }
  );

  await db.close();
});
test('Doppelte Mitgliedschaft wird abgelehnt', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail(email) {
      if (email === 'mitglied@thm.de') {
        return {
          id: 'test-user-2',
          email: 'mitglied@thm.de'
        };
      }

      return null;
    }
  };

  const groupService = createGroupService(db, userDirectory);

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  await groupService.addMember(
    'test-user-1',
    group.id,
    'mitglied@thm.de'
  );

  await assert.rejects(
    () =>
      groupService.addMember(
        'test-user-1',
        group.id,
        'mitglied@thm.de'
      ),
    {
      code: 'CONFLICT'
    }
  );

  await db.close();
});
test('Unbekannte oder nicht bestätigte E-Mail wird abgelehnt', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail() {
      return null;
    }
  };

  const groupService = createGroupService(db, userDirectory);

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  await assert.rejects(
    () =>
      groupService.addMember(
        'test-user-1',
        group.id,
        'unbekannt@thm.de'
      ),
    {
      code: 'NOT_FOUND'
    }
  );

  await db.close();
});
test('Mitglied kann entfernt werden und ist danach kein Mitglied mehr', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail(email) {
      if (email === 'mitglied@thm.de') {
        return {
          id: 'test-user-2',
          email: 'mitglied@thm.de'
        };
      }

      return null;
    }
  };

  const groupService = createGroupService(db, userDirectory);

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  await groupService.addMember(
    'test-user-1',
    group.id,
    'mitglied@thm.de'
  );

  await groupService.removeMember(
    'test-user-1',
    group.id,
    'test-user-2'
  );

  const member = await db.get(
    `SELECT *
     FROM group_members
     WHERE groupId = ? AND userId = ?`,
    [group.id, 'test-user-2']
  );

  assert.equal(member, undefined);

  await db.close();
});
test('Owner darf sich nicht selbst entfernen', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail() {
      return null;
    }
  };

  const groupService = createGroupService(db, userDirectory);

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  await assert.rejects(
    () =>
      groupService.removeMember(
        'test-user-1',
        group.id,
        'test-user-1'
      ),
    {
      code: 'BAD_REQUEST'
    }
  );

  await db.close();
});
test('Nur Gruppenmitglieder dürfen die Mitglieder einer Gruppe auflisten', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail() {
      return null;
    }
  };

  const groupService = createGroupService(db, userDirectory);

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  const members = await groupService.listMembers(
    'test-user-1',
    group.id
  );

  assert.deepEqual(members, [
    { userId: 'test-user-1' }
  ]);

  await assert.rejects(
    () =>
      groupService.listMembers(
        'test-user-2',
        group.id
      ),
    {
      code: 'FORBIDDEN'
    }
  );

  await db.close();
});
test('Nichtmitglied darf eine Gruppe nicht abrufen', async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
    );
  `);

  const userDirectory = {
    async findVerifiedByEmail() {
      return null;
    }
  };

  const groupService = createGroupService(
    db,
    userDirectory
  );

  const group = await groupService.createGroup(
    'test-user-1',
    'Testgruppe'
  );

  await assert.rejects(
    () => groupService.getGroup(
      'test-user-2',
      group.id
    ),
    {
      code: 'NOT_FOUND'
    }
  );

  await db.close();
});