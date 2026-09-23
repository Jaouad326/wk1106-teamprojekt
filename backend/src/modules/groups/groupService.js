import crypto from 'crypto';

export function createGroupService(db, userDirectory) {
  async function createGroup(userId, name) {
    const trimmedName = name?.trim();

    if (!trimmedName || trimmedName.length > 80) {
      const error = new Error('Gruppenname muss zwischen 1 und 80 Zeichen lang sein.');
      error.code = 'BAD_REQUEST';
      throw error;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.exec('BEGIN IMMEDIATE');

    try {
      await db.run(
        `INSERT INTO groups (id, name, ownerId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [id, trimmedName, userId, now, now]
      );

      await db.run(
        `INSERT INTO group_members (groupId, userId)
         VALUES (?, ?)`,
        [id, userId]
      );

      await db.exec('COMMIT');

      return {
        id,
        name: trimmedName,
        ownerId: userId,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }

  async function addMember(ownerId, groupId, email) {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      const error = new Error('E-Mail-Adresse fehlt.');
      error.code = 'BAD_REQUEST';
      throw error;
    }

    const group = await db.get(
      'SELECT * FROM groups WHERE id = ?',
      [groupId]
    );

    if (!group) {
      const error = new Error('Gruppe nicht gefunden.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (group.ownerId !== ownerId) {
      const error = new Error('Nur der Gruppenbesitzer darf Mitglieder verwalten.');
      error.code = 'FORBIDDEN';
      throw error;
    }

    const user = await userDirectory.findVerifiedByEmail(normalizedEmail);

    if (!user) {
      const error = new Error('Kein bestätigtes Konto mit dieser E-Mail-Adresse gefunden.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    try {
      await db.run(
        `INSERT INTO group_members (groupId, userId)
         VALUES (?, ?)`,
        [groupId, user.id]
      );
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        error.code = 'CONFLICT';
        error.message = 'Dieser Benutzer ist bereits Mitglied der Gruppe.';
      }

      throw error;
    }

    return {
      groupId,
      userId: user.id
    };
  }

  async function removeMember(ownerId, groupId, userId) {
    const group = await db.get(
      'SELECT * FROM groups WHERE id = ?',
      [groupId]
    );

    if (!group) {
      const error = new Error('Gruppe nicht gefunden.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (group.ownerId !== ownerId) {
      const error = new Error('Nur der Gruppenbesitzer darf Mitglieder verwalten.');
      error.code = 'FORBIDDEN';
      throw error;
    }

    if (userId === group.ownerId) {
      const error = new Error('Der Gruppenbesitzer kann sich nicht selbst entfernen.');
      error.code = 'BAD_REQUEST';
      throw error;
    }

    await db.run(
      `DELETE FROM group_members
       WHERE groupId = ? AND userId = ?`,
      [groupId, userId]
    );
  }

    async function listGroups(userId) {
    return await db.all(
      `SELECT g.*
       FROM groups g
       INNER JOIN group_members gm
         ON gm.groupId = g.id
       WHERE gm.userId = ?
       ORDER BY g.name ASC`,
      [userId]
    );
  }

  async function getGroup(userId, groupId) {
    const group = await db.get(
      `SELECT g.*
       FROM groups g
       INNER JOIN group_members gm
         ON gm.groupId = g.id
       WHERE g.id = ? AND gm.userId = ?`,
      [groupId, userId]
    );

    if (!group) {
      const error = new Error('Gruppe nicht gefunden.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return group;
  }
  
    async function listMembers(userId, groupId) {
    const membership = await db.get(
      `SELECT 1
       FROM group_members
       WHERE groupId = ? AND userId = ?`,
      [groupId, userId]
    );

    if (!membership) {
      const error = new Error('Kein Zugriff auf diese Gruppe.');
      error.code = 'FORBIDDEN';
      throw error;
    }

    return await db.all(
      `SELECT userId
       FROM group_members
       WHERE groupId = ?
       ORDER BY userId ASC`,
      [groupId]
    );
  }

  return {
    createGroup,
    addMember,
    removeMember,
    listGroups,
    getGroup,
    listMembers
  };
}