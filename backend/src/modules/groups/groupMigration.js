export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,

      PRIMARY KEY (groupId, userId),

      FOREIGN KEY (groupId)
        REFERENCES groups(id)
        ON DELETE CASCADE
    );
  `);
}