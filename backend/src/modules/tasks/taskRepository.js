import { randomUUID } from 'node:crypto';

const columns = 'id, title, description, dueAt, importance, difficulty, effortHours, status, ownerId, groupId, createdAt, updatedAt';

export function createTaskRepository({ openDb }) {
  async function withDb(operation, write = false) {
    const db = await openDb();
    try {
      await db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
      if (write) await db.exec('BEGIN IMMEDIATE');
      const result = await operation(db);
      if (write) await db.exec('COMMIT');
      return result;
    } catch (error) {
      if (write) await db.exec('ROLLBACK');
      throw error;
    } finally { await db.close(); }
  }
  return {
    // Eigene Aufgaben und Aufgaben aller Gruppen, in denen der Nutzer Mitglied ist.
    // Der Service prüft die Sichtbarkeit je Aufgabe zusätzlich über den AccessService.
    list: (userId, status) => withDb(db => db.all(
      `SELECT ${columns} FROM tasks
       WHERE (ownerId = ? OR groupId IN (SELECT groupId FROM group_members WHERE userId = ?))
       ${status ? 'AND status = ?' : ''}
       ORDER BY dueAt ASC, createdAt DESC`,
      status ? [userId, userId, status] : [userId, userId]
    )),
    findById: id => withDb(db => db.get(`SELECT ${columns} FROM tasks WHERE id = ?`, [id])),
    insert: task => withDb(async db => { await db.run(`INSERT INTO tasks (${columns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [task.id, task.title, task.description, task.dueAt, task.importance, task.difficulty, task.effortHours, task.status, task.ownerId, task.groupId, task.createdAt, task.updatedAt]); return task; }, true),
    update: task => withDb(async db => { await db.run(`UPDATE tasks SET title = ?, description = ?, dueAt = ?, importance = ?, difficulty = ?, effortHours = ?, status = ?, updatedAt = ? WHERE id = ?`, [task.title, task.description, task.dueAt, task.importance, task.difficulty, task.effortHours, task.status, task.updatedAt, task.id]); return task; }, true),
    remove: id => withDb(db => db.run('DELETE FROM tasks WHERE id = ?', [id]), true)
  };
}
