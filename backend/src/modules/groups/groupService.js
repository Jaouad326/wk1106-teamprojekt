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
        const trimmedName = typeof name === 'string' ? name.trim() : '';
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
           `SELECT gm.userId, u.email, u.displayName
            FROM group_members gm
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
        return { groupId, userId: member.id, email: member.email, displayName: member.displayName };
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

    leaveGroup(userId, groupId, successorId) {
      return withDb(async db => {
        await db.exec('BEGIN IMMEDIATE');
        try {
          const group = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
          if (!group) fail('NOT_FOUND', 'Gruppe nicht gefunden.');
          const membership = await db.get('SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
          if (!membership) fail('FORBIDDEN', 'Du bist kein Mitglied dieser Gruppe.');
          let dissolved = false;
          if (group.ownerId === userId) {
            const others = await db.all('SELECT userId FROM group_members WHERE groupId = ? AND userId != ?', [groupId, userId]);
            if (others.length) {
              if (!others.some(member => member.userId === successorId)) {
                fail('BAD_REQUEST', 'Bitte wähle ein aktuelles Mitglied als neue Gruppenleitung.');
              }
              await db.run('UPDATE groups SET ownerId = ?, updatedAt = ? WHERE id = ?', [successorId, new Date().toISOString(), groupId]);
            } else {
              // Keine Aufgaben oder Kommentare löschen: Das letzte Mitglied behält sie persönlich.
              const hasTasks = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'");
              if (hasTasks) await db.run('UPDATE tasks SET groupId = NULL, ownerId = ?, updatedAt = ? WHERE groupId = ?', [userId, new Date().toISOString(), groupId]);
              await db.run('DELETE FROM group_invitations WHERE groupId = ?', [groupId]);
              await db.run('DELETE FROM group_members WHERE groupId = ?', [groupId]);
              await db.run('DELETE FROM groups WHERE id = ?', [groupId]);
              dissolved = true;
            }
          }
          if (!dissolved) await db.run('DELETE FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
          await db.exec('COMMIT');
          return { groupId, dissolved };
        } catch (error) { await db.exec('ROLLBACK'); throw error; }
      });
    }
  };
}
