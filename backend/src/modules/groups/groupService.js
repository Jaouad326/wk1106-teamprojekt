import { randomUUID } from 'node:crypto';

export function createGroupService({ openDb, userDirectory }) {
  async function withDb(operation) {
    const db = await openDb();
    try {
      await db.exec('PRAGMA busy_timeout = 5000;');
      return await operation(db);
    } finally {
      await db.close();
    }
  }

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  return {
    createGroup(userId, name) {
      return withDb(async db => {
        const trimmedName = name?.trim();
        if (!trimmedName || trimmedName.length > 80) {
          fail('BAD_REQUEST', 'Der Gruppenname muss zwischen 1 und 80 Zeichen lang sein.');
        }
        const id = randomUUID();
        const timestamp = new Date().toISOString();
        await db.exec('BEGIN IMMEDIATE');
        try {
          await db.run(
            `INSERT INTO groups (id, name, ownerId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?)`,
            [id, trimmedName, userId, timestamp, timestamp]
          );
          await db.run(
            'INSERT INTO group_members (groupId, userId) VALUES (?, ?)',
            [id, userId]
          );
          await db.exec('COMMIT');
          return { id, name: trimmedName, ownerId: userId, createdAt: timestamp, updatedAt: timestamp };
        } catch (error) {
          await db.exec('ROLLBACK');
          throw error;
        }
      });
    },

    listGroups(userId) {
      return withDb(db => db.all(
        `SELECT g.* FROM groups g
         JOIN group_members gm ON gm.groupId = g.id
         WHERE gm.userId = ? ORDER BY g.name ASC`,
        [userId]
      ));
    },

    listMembers(userId, groupId) {
      return withDb(async db => {
        const membership = await db.get(
          'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?',
          [groupId, userId]
        );
        if (!membership) fail('FORBIDDEN', 'Du hast keinen Zugriff auf diese Gruppe.');
        return db.all(
          `SELECT gm.userId, u.email FROM group_members gm
           LEFT JOIN users u ON u.id = gm.userId
           WHERE gm.groupId = ? ORDER BY gm.userId ASC`,
          [groupId]
        );
      });
    },

    addMember(ownerId, groupId, email) {
      return withDb(async db => {
        const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
        if (!group) fail('NOT_FOUND', 'Gruppe nicht gefunden.');
        if (group.ownerId !== ownerId) fail('FORBIDDEN', 'Nur der Gruppenbesitzer darf Mitglieder verwalten.');
        const member = await userDirectory.findVerifiedByEmail(email);
        if (!member) fail('NOT_FOUND', 'Kein bestätigtes Konto mit dieser E-Mail-Adresse gefunden.');
        try {
          await db.run('INSERT INTO group_members (groupId, userId) VALUES (?, ?)', [groupId, member.id]);
        } catch (error) {
          if (error.message.includes('UNIQUE')) fail('CONFLICT', 'Dieser Benutzer ist bereits Mitglied der Gruppe.');
          throw error;
        }
        return { groupId, userId: member.id, email: member.email };
      });
    },

        removeMember(ownerId, groupId, userId) {
      return withDb(async db => {
        const group = await db.get(
          'SELECT * FROM groups WHERE id = ?',
          [groupId]
        );

        if (!group) {
          fail('NOT_FOUND', 'Gruppe nicht gefunden.');
        }

        if (group.ownerId !== ownerId) {
          fail(
            'FORBIDDEN',
            'Nur der Gruppenbesitzer darf Mitglieder verwalten.'
          );
        }

        if (userId === group.ownerId) {
          fail(
            'BAD_REQUEST',
            'Der Gruppenbesitzer kann sich nicht selbst entfernen.'
          );
        }

        await db.run(
          'DELETE FROM group_members WHERE groupId = ? AND userId = ?',
          [groupId, userId]
        );
      });
    },

    leaveGroup(userId, groupId) {
      return withDb(async db => {
        const group = await db.get(
          'SELECT * FROM groups WHERE id = ?',
          [groupId]
        );

        if (!group) {
          fail('NOT_FOUND', 'Gruppe nicht gefunden.');
        }

        if (group.ownerId === userId) {
          fail(
            'BAD_REQUEST',
            'Der Gruppenbesitzer kann die Gruppe nicht verlassen.'
          );
        }

        const result = await db.run(
          'DELETE FROM group_members WHERE groupId = ? AND userId = ?',
          [groupId, userId]
        );

        if (result.changes === 0) {
          fail(
            'FORBIDDEN',
            'Du bist kein Mitglied dieser Gruppe.'
          );
        }

        return { groupId };
      });
    }
  };
}