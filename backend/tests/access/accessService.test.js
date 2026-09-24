import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { createAccessService } from '../../src/access/accessService.js';

async function createTestDb() {
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

  return db;
}

test('erkennt ein Gruppenmitglied', async () => {
  const db = await createTestDb();

  await db.run(
    `INSERT INTO groups
     (id, name, ownerId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    ['group-1', 'Testgruppe', 'user-1', '2026-01-01', '2026-01-01']
  );

  await db.run(
    `INSERT INTO group_members (groupId, userId)
     VALUES (?, ?)`,
    ['group-1', 'user-1']
  );

  const accessService = createAccessService(db);

  assert.equal(
    await accessService.isGroupMember('user-1', 'group-1'),
    true
  );

  assert.equal(
    await accessService.isGroupMember('user-2', 'group-1'),
    false
  );

  await db.close();
});

test('erkennt den Gruppenbesitzer', async () => {
  const db = await createTestDb();

  await db.run(
    `INSERT INTO groups
     (id, name, ownerId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    ['group-1', 'Testgruppe', 'user-1', '2026-01-01', '2026-01-01']
  );

  const accessService = createAccessService(db);

  assert.equal(
    await accessService.isGroupOwner('user-1', 'group-1'),
    true
  );

  assert.equal(
    await accessService.isGroupOwner('user-2', 'group-1'),
    false
  );

  await db.close();
});

test('Besitzer darf persönliche Aufgabe lesen', async () => {
  const db = await createTestDb();
  const accessService = createAccessService(db);

  const task = {
    id: 'task-1',
    ownerId: 'user-1',
    groupId: null
  };

  assert.equal(
    await accessService.canReadTask('user-1', task),
    true
  );

  assert.equal(
    await accessService.canReadTask('user-2', task),
    false
  );

  await db.close();
});

test('Gruppenmitglied darf Gruppenaufgabe lesen', async () => {
  const db = await createTestDb();

  await db.run(
    `INSERT INTO groups
     (id, name, ownerId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    ['group-1', 'Testgruppe', 'user-1', '2026-01-01', '2026-01-01']
  );

  await db.run(
    `INSERT INTO group_members (groupId, userId)
     VALUES (?, ?)`,
    ['group-1', 'user-2']
  );

  const accessService = createAccessService(db);

  const task = {
    id: 'task-1',
    ownerId: 'user-1',
    groupId: 'group-1'
  };

  assert.equal(
    await accessService.canReadTask('user-2', task),
    true
  );

  assert.equal(
    await accessService.canReadTask('user-3', task),
    false
  );

  await db.close();
});

test('entferntes Mitglied verliert den Zugriff auf eine Gruppenaufgabe', async () => {
  const db = await createTestDb();

  await db.run(
    `INSERT INTO groups
     (id, name, ownerId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    ['group-1', 'Testgruppe', 'user-1', '2026-01-01', '2026-01-01']
  );

  await db.run(
    `INSERT INTO group_members (groupId, userId)
     VALUES (?, ?)`,
    ['group-1', 'user-2']
  );

  const accessService = createAccessService(db);

  const task = {
    id: 'task-1',
    ownerId: 'user-1',
    groupId: 'group-1'
  };

  assert.equal(
    await accessService.canReadTask('user-2', task),
    true
  );

  await db.run(
    `DELETE FROM group_members
     WHERE groupId = ? AND userId = ?`,
    ['group-1', 'user-2']
  );

  assert.equal(
    await accessService.canReadTask('user-2', task),
    false
  );

  await db.close();
});

test('Leserecht und Schreibrecht gelten für Gruppenmitglieder', async () => {
  const db = await createTestDb();

  await db.run(
    `INSERT INTO groups
     (id, name, ownerId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    ['group-1', 'Testgruppe', 'user-1', '2026-01-01', '2026-01-01']
  );

  await db.run(
    `INSERT INTO group_members (groupId, userId)
     VALUES (?, ?)`,
    ['group-1', 'user-2']
  );

  const accessService = createAccessService(db);

  const task = {
    id: 'task-1',
    ownerId: 'user-1',
    groupId: 'group-1'
  };

  assert.equal(
    await accessService.canReadTask('user-2', task),
    true
  );

  assert.equal(
    await accessService.canWriteTask('user-2', task),
    true
  );

  assert.equal(
    await accessService.canWriteTask('user-3', task),
    false
  );

  await db.close();
});

test('Aufgabe ohne Task-Objekt wird abgelehnt', async () => {
  const db = await createTestDb();
  const accessService = createAccessService(db);

  assert.equal(
    await accessService.canReadTask('user-1', null),
    false
  );

  assert.equal(
    await accessService.canReadTask('user-1', undefined),
    false
  );

  await db.close();
});
test('Ursprünglicher Ersteller verliert nach Entfernung aus der Gruppe den Zugriff', async () => {
  const db = await createTestDb();

  await db.run(
    `INSERT INTO groups
     (id, name, ownerId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?)`,
    ['group-1', 'Testgruppe', 'owner-1', '2026-01-01', '2026-01-01']
  );

  await db.run(
    `INSERT INTO group_members (groupId, userId)
     VALUES (?, ?)`,
    ['group-1', 'user-1']
  );

  const accessService = createAccessService(db);

  const task = {
    id: 'task-1',
    ownerId: 'user-1',
    groupId: 'group-1'
  };

  // Vor der Entfernung besteht Zugriff.
  assert.equal(
    await accessService.canReadTask('user-1', task),
    true
  );

  // Benutzer wird aus der Gruppe entfernt.
  await db.run(
    `DELETE FROM group_members
     WHERE groupId = ? AND userId = ?`,
    ['group-1', 'user-1']
  );

  // Danach entscheidet nur noch die aktuelle Mitgliedschaft:
  // kein Zugriff mehr.
  assert.equal(
    await accessService.canReadTask('user-1', task),
    false
  );

  await db.close();
});