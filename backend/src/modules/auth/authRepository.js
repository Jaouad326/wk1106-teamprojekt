import { randomUUID } from 'node:crypto';

// openDb must provide a NEW sqlite connection per call (e.g. getDbConnection).
// Separate connections prevent overlapping requests from sharing a transaction.
export function createAuthRepository({ openDb }) {
  async function withDb(operation) {
    const db = await openDb();
    try {
      await db.exec('PRAGMA busy_timeout = 5000;');
      return await operation(db);
    } finally {
      await db.close();
    }
  }

  return {
    saveLoginToken({ tokenHash, email, createdAt, expiresAt }) {
      return withDb(db => db.run(
        `INSERT INTO auth_login_tokens (tokenHash, email, createdAt, expiresAt)
         VALUES (?, ?, ?, ?)`,
        [tokenHash, email, createdAt, expiresAt]
      ));
    },

    revokeLoginToken(tokenHash) {
      return withDb(db => db.run(
        'DELETE FROM auth_login_tokens WHERE tokenHash = ?', [tokenHash]
      ));
    },

    consumeLoginToken(tokenHash, verifiedAt) {
      return withDb(async db => {
        await db.exec('BEGIN IMMEDIATE;');
        try {
          const token = await db.get(
            `UPDATE auth_login_tokens SET usedAt = ?
             WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > ?
             RETURNING email`,
            [verifiedAt, tokenHash, verifiedAt]
          );
          if (!token) {
            await db.exec('COMMIT;');
            return null;
          }
          await db.run(
            `INSERT INTO users (id, email, emailVerifiedAt, createdAt)
             VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING`,
            [randomUUID(), token.email, verifiedAt, verifiedAt]
          );
          const user = await db.get(
            'SELECT id, email, emailVerifiedAt, createdAt FROM users WHERE email = ?',
            [token.email]
          );
          await db.exec('COMMIT;');
          return user;
        } catch (error) {
          await db.exec('ROLLBACK;');
          throw error;
        }
      });
    },

    findVerifiedByEmail(email) {
      return withDb(async db => (await db.get(
        'SELECT id, email, emailVerifiedAt, createdAt FROM users WHERE email = ?',
        [email]
      )) ?? null);
    }
  };
}
