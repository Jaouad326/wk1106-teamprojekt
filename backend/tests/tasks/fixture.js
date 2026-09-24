// Ausschließlich Testcode. Diese Benutzer-/Gruppenadapter nie produktiv montieren.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import express from 'express';
import { up as migrateTasks } from '../../src/modules/tasks/taskMigration.js';
import { up as migrateComments } from '../../src/modules/comments/commentMigration.js';
import { createTaskRepository } from '../../src/modules/tasks/taskRepository.js';
import { createTaskService } from '../../src/modules/tasks/taskService.js';
import { createTaskRouter } from '../../src/modules/tasks/taskRoutes.js';

export const validTask = (changes = {}) => ({
  title: 'Statistik üben', description: 'Kapitel 2 wiederholen', dueAt: '2026-09-25T16:00:00+02:00',
  importance: 4, difficulty: 3, effortHours: 1.5, ...changes
});

export async function createFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'studyprio-tasks-'));
  const filename = path.join(directory, 'test.sqlite');
  const openDb = async () => {
    const db = await open({ filename, driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    return db;
  };
  const db = await openDb();
  // Minimales, explizites SQLite-Testschema für die noch fehlende Gruppenintegration.
  await db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, emailVerifiedAt TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, ownerId TEXT NOT NULL REFERENCES users(id), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE memberships (groupId TEXT NOT NULL REFERENCES groups(id), userId TEXT NOT NULL REFERENCES users(id), PRIMARY KEY (groupId, userId));
  `);
  for (const id of ['alice', 'bob', 'outsider']) await db.run('INSERT INTO users VALUES (?, ?, ?, ?)', [id, `${id}@campus.example`, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z']);
  await db.run('INSERT INTO groups VALUES (?, ?, ?, ?, ?)', ['study-group', 'Lerngruppe', 'alice', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z']);
  await db.exec("INSERT INTO memberships VALUES ('study-group', 'alice'), ('study-group', 'bob');");
  await migrateTasks(db);
  await migrateComments(db);
  await db.close();
  const accessState = { fail: false, writeAllowed: true };
  const accessService = {
    async isGroupMember(userId, groupId) {
      if (accessState.fail) throw new Error('Test: Gruppenservice nicht erreichbar');
      const db = await openDb();
      try { return Boolean(await db.get('SELECT 1 FROM memberships WHERE groupId = ? AND userId = ?', [groupId, userId])); }
      finally { await db.close(); }
    },
    async canReadTask(userId, task) {
      if (accessState.fail) throw new Error('Test: Rechteprüfung nicht erreichbar');
      return task.groupId === null ? task.ownerId === userId : this.isGroupMember(userId, task.groupId);
    },
    async canWriteTask(userId, task) { return accessState.writeAllowed && this.canReadTask(userId, task); },
    async isGroupOwner(userId, groupId) {
      const db = await openDb();
      try { return Boolean(await db.get('SELECT 1 FROM groups WHERE id = ? AND ownerId = ?', [groupId, userId])); }
      finally { await db.close(); }
    }
  };
  const service = createTaskService({ repository: createTaskRepository({ openDb }), accessService });
  let testUser = 'alice';
  const requireAuth = (req, res, next) => {
    if (!testUser) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Test: nicht angemeldet.' } });
    req.user = { id: testUser, email: `${testUser}@campus.example` };
    next();
  };
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use('/api/tasks', createTaskRouter({ taskService: service, requireAuth }));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Ungültiges JSON.' } });
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Fehler.' } });
  });
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    openDb, service, accessService, accessState, filename, origin,
    setUser(userId) { testUser = userId; },
    async request(method, path = '', body) {
      const response = await fetch(`${origin}/api/tasks${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, headers: response.headers, ...(await response.json()) };
    },
    async close() { await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
  };
}
