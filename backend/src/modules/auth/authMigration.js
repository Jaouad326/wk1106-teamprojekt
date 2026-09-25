// Auth-Tabellen zuerst anlegen, bevor andere Module Nutzer referenzieren.
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      displayName TEXT NOT NULL DEFAULT '',
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
    CREATE TABLE IF NOT EXISTS auth_sessions (
      tokenHash TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expiresAt);
    CREATE TABLE IF NOT EXISTS auth_limits (
      keyHash TEXT PRIMARY KEY,
      hits INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      mailMode TEXT NOT NULL CHECK (mailMode IN ('local', 'smtp'))
    );
  `);
  const columns = await db.all('PRAGMA table_info(users)');
  if (!columns.some(column => column.name === 'displayName')) {
    await db.exec("ALTER TABLE users ADD COLUMN displayName TEXT NOT NULL DEFAULT ''");
  }
}
