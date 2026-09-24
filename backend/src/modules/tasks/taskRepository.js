import { TaskError } from './taskError.js';

const columns = 'id, title, description, dueAt, importance, difficulty, effortHours, status, ownerId, groupId, createdAt, updatedAt';

function onConnection(db) {
  return {
    list: (status) => db.all(`SELECT ${columns} FROM tasks ${status ? 'WHERE status = ?' : ''} ORDER BY createdAt DESC, id ASC`, status ? [status] : []),
    findById: (id) => db.get(`SELECT ${columns} FROM tasks WHERE id = ?`, [id]),
    async insert(task) {
      await db.run(`INSERT INTO tasks (${columns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        task.id, task.title, task.description, task.dueAt, task.importance, task.difficulty,
        task.effortHours, task.status, task.ownerId, task.groupId, task.createdAt, task.updatedAt
      ]);
      return task;
    },
    async update(task) {
      await db.run(`UPDATE tasks SET title = ?, description = ?, dueAt = ?, importance = ?,
        difficulty = ?, effortHours = ?, status = ?, updatedAt = ? WHERE id = ?`, [
        task.title, task.description, task.dueAt, task.importance, task.difficulty,
        task.effortHours, task.status, task.updatedAt, task.id
      ]);
      return task;
    },
    async remove(id) { await db.run('DELETE FROM tasks WHERE id = ?', [id]); }
  };
}

export function createTaskRepository({ openDb }) {
  if (typeof openDb !== 'function') throw new TypeError('openDb fehlt.');
  async function withConnection(work, write) {
    const db = await openDb();
    let transaction = false;
    try {
      await db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
      if ((await db.get('PRAGMA foreign_keys')).foreign_keys !== 1) throw new Error('Foreign Keys sind nicht aktiv.');
      // Vor der Rechteprüfung sperren: Mitgliedschaft und Task-Änderung dürfen
      // nicht durch einen parallelen SQLite-Schreibzugriff auseinanderlaufen.
      if (write) { await db.exec('BEGIN IMMEDIATE'); transaction = true; }
      const result = await work(onConnection(db));
      if (transaction) { await db.exec('COMMIT'); transaction = false; }
      return result;
    } catch (error) {
      if (transaction) await db.exec('ROLLBACK');
      if (error.code === 'SQLITE_BUSY') throw new TaskError(503, 'DATABASE_BUSY', 'Die Datenbank ist beschäftigt. Bitte erneut versuchen.');
      if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('FOREIGN KEY')) {
        throw new TaskError(409, 'REFERENCE_CONFLICT', 'Benutzer oder Gruppe existiert nicht mehr. Bitte lade die Ansicht neu.');
      }
      throw error;
    } finally { await db.close(); }
  }
  return {
    read: (work) => withConnection(work, false),
    write: (work) => withConnection(work, true)
  };
}
