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
      FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
    );
  `);
  await db.exec(`
  CREATE TABLE IF NOT EXISTS group_invitations (
    id TEXT PRIMARY KEY,
    groupId TEXT NOT NULL,
    invitedUserId TEXT NOT NULL,
    invitedBy TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
    createdAt TEXT NOT NULL,
    respondedAt TEXT,
    FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (invitedUserId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invitedBy) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS group_invitations_user_status
    ON group_invitations(invitedUserId, status);
`);
}
