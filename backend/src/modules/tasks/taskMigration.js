export async function up(db) {
  const existing = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'");
  if (existing) {
    const columns = await db.all('PRAGMA table_info(tasks)');
    if (!columns.some(column => column.name === 'ownerId')) {
      const legacyName = `tasks_legacy_${Date.now()}`;
      await db.exec(`ALTER TABLE tasks RENAME TO ${legacyName}`);
    }
  }
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      dueAt TEXT NOT NULL,
      importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 5),
      difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
      effortHours REAL NOT NULL CHECK (effortHours BETWEEN 0.25 AND 200),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
      ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      groupId TEXT REFERENCES groups(id) ON DELETE RESTRICT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_owner ON tasks(ownerId);
    CREATE INDEX IF NOT EXISTS tasks_group ON tasks(groupId);
    CREATE INDEX IF NOT EXISTS tasks_status ON tasks(status);
  `);
  await repairCommentsForeignKey(db);
}
// SQLite benennt Fremdschlüssel anderer Tabellen automatisch um, wenn eine
// referenzierte Tabelle per RENAME verschoben wird (hier: die alte tasks-Tabelle).
// Dadurch zeigte comments.taskId nach der Legacy-Umbenennung ins Leere.
// Diese Reparatur ist idempotent: Sie greift nur, wenn der FK nicht auf tasks zeigt.
async function repairCommentsForeignKey(db) {
  const commentsTable = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'comments'");
  if (!commentsTable) return;
  const foreignKeys = await db.all('PRAGMA foreign_key_list(comments)');
  const misdirected = foreignKeys.some(fk => fk.from === 'taskId' && fk.table !== 'tasks');
  if (!misdirected) return;
  await db.exec(`
    CREATE TABLE comments_fk_repair (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      authorId TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
    INSERT INTO comments_fk_repair (id, taskId, authorId, body, createdAt)
      SELECT id, taskId, authorId, body, createdAt FROM comments;
    DROP TABLE comments;
    ALTER TABLE comments_fk_repair RENAME TO comments;
  `);
}
