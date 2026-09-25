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
    ensureMailMode(mode) {
      return withDb(async db => {
        await db.exec('BEGIN IMMEDIATE');
        try {
          const setting = await db.get('SELECT mailMode FROM auth_settings WHERE id = 1');
          const legacy = !setting && await db.get(
            'SELECT 1 FROM users UNION ALL SELECT 1 FROM auth_login_tokens LIMIT 1'
          );
          if ((setting && setting.mailMode !== mode) || (legacy && mode === 'smtp')) {
            const error = new Error('Für SMTP eine neue Datenbank verwenden. Lokale Testkonten nicht übernehmen.');
            error.code = 'AUTH_MAIL_MODE_MISMATCH';
            throw error;
          }
          await db.run('INSERT OR IGNORE INTO auth_settings (id, mailMode) VALUES (1, ?)', [mode]);
          await db.exec('COMMIT');
        } catch (error) { await db.exec('ROLLBACK'); throw error; }
      });
    },

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

    consumeLoginToken(tokenHash, verifiedAt, session) {
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
            'SELECT id, email, displayName, emailVerifiedAt, createdAt FROM users WHERE email = ?',
            [token.email]
          );
          // Link und Sitzung gehören in dieselbe Transaktion.
          if (session) {
            await db.run(
              'INSERT INTO auth_sessions (tokenHash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)',
              [session.tokenHash, user.id, verifiedAt, session.expiresAt]
            );
            if (session.previousHash) {
              await db.run('DELETE FROM auth_sessions WHERE tokenHash = ?', [session.previousHash]);
            }
          }
          await db.exec('COMMIT;');
          return user;
        } catch (error) {
          await db.exec('ROLLBACK;');
          throw error;
        }
      });
    },

    findSession(tokenHash, at) {
      return withDb(async db => (await db.get(
        `SELECT u.id, u.email, u.displayName, u.emailVerifiedAt, u.createdAt FROM auth_sessions s
         JOIN users u ON u.id = s.userId WHERE s.tokenHash = ? AND s.expiresAt > ?`,
        [tokenHash, at]
      )) ?? null);
    },

    deleteSession(tokenHash) {
      return withDb(db => db.run('DELETE FROM auth_sessions WHERE tokenHash = ?', [tokenHash]));
    },

    takeAttempt(keyHash, at, windowMs) {
      return withDb(db => db.get(
        `INSERT INTO auth_limits (keyHash, hits, expiresAt) VALUES (?, 1, ?)
         ON CONFLICT(keyHash) DO UPDATE SET
           hits = CASE WHEN expiresAt <= ? THEN 1 ELSE hits + 1 END,
           expiresAt = CASE WHEN expiresAt <= ? THEN excluded.expiresAt ELSE expiresAt END
         RETURNING hits, expiresAt`, [keyHash, at + windowMs, at, at]
      ));
    },

    cleanup(at) {
      return withDb(async db => {
        await db.run('DELETE FROM auth_login_tokens WHERE expiresAt <= ? OR usedAt IS NOT NULL', [at.toISOString()]);
        await db.run('DELETE FROM auth_sessions WHERE expiresAt <= ?', [at.toISOString()]);
        await db.run('DELETE FROM auth_limits WHERE expiresAt <= ?', [at.getTime()]);
      });
    },

    findVerifiedByEmail(email) {
      return withDb(async db => (await db.get(
        'SELECT id, email, displayName, emailVerifiedAt, createdAt FROM users WHERE email = ?',
        [email]
      )) ?? null);
    },

    updateProfile(userId, displayName) {
      return withDb(async db => {
        await db.run('UPDATE users SET displayName = ? WHERE id = ?', [displayName, userId]);
        return db.get(
          'SELECT id, email, displayName, emailVerifiedAt, createdAt FROM users WHERE id = ?',
          [userId]
        );
      });
    }
  };
}
