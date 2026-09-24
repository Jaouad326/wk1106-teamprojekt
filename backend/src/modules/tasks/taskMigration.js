// Reihenfolge: Jaouads users, Haizams groups, tasks, Ahshans comments.
// Fremde Tabellen werden hier ausdrücklich nicht als Platzhalter angelegt.
export async function up(db) {
  const foreignKeys = await db.get('PRAGMA foreign_keys');
  if (foreignKeys.foreign_keys !== 1) throw new Error('Task-Migration benötigt PRAGMA foreign_keys = ON auf dieser Verbindung.');
  for (const name of ['users', 'groups']) {
    const table = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [name]);
    if (!table) throw new Error(`Task-Migration: zuerst die echte ${name}-Migration ausführen.`);
  }
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
      description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
      dueAt TEXT NOT NULL,
      importance INTEGER NOT NULL CHECK (typeof(importance) = 'integer' AND importance BETWEEN 1 AND 5),
      difficulty INTEGER NOT NULL CHECK (typeof(difficulty) = 'integer' AND difficulty BETWEEN 1 AND 5),
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
}
