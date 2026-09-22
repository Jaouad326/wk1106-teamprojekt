// Owns only auth tables. Register this before task/group migrations at integration.
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      emailVerifiedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_login_tokens (
      tokenHash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      usedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS auth_login_tokens_expiry
      ON auth_login_tokens(expiresAt);
  `);
}
