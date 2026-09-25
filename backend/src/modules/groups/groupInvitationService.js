import { randomUUID } from 'node:crypto';

export function createGroupInvitationService({ openDb, userDirectory }) {
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

  async function createInvitation(ownerId, groupId, email) {
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
          'Nur der Gruppenbesitzer darf Mitglieder einladen.'
        );
      }

      const normalizedEmail = email?.trim().toLowerCase();

      if (!normalizedEmail) {
        fail('BAD_REQUEST', 'E-Mail-Adresse fehlt.');
      }

      const user = await userDirectory.findVerifiedByEmail(normalizedEmail);

      if (!user) {
        fail(
          'NOT_FOUND',
          'Kein bestätigtes Konto mit dieser E-Mail-Adresse gefunden.'
        );
      }

      const existingMember = await db.get(
        `SELECT 1
         FROM group_members
         WHERE groupId = ? AND userId = ?`,
        [groupId, user.id]
      );

      if (existingMember) {
        fail(
          'CONFLICT',
          'Dieser Benutzer ist bereits Mitglied der Gruppe.'
        );
      }

      const existingInvitation = await db.get(
        `SELECT 1
         FROM group_invitations
         WHERE groupId = ?
           AND invitedUserId = ?
           AND status = 'pending'`,
        [groupId, user.id]
      );

      if (existingInvitation) {
        fail(
          'CONFLICT',
          'Für diesen Benutzer gibt es bereits eine offene Einladung.'
        );
      }

      const invitation = {
        id: randomUUID(),
        groupId,
        invitedUserId: user.id,
        invitedBy: ownerId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        respondedAt: null
      };

      await db.run(
        `INSERT INTO group_invitations
         (id, groupId, invitedUserId, invitedBy, status, createdAt, respondedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          invitation.id,
          invitation.groupId,
          invitation.invitedUserId,
          invitation.invitedBy,
          invitation.status,
          invitation.createdAt,
          invitation.respondedAt
        ]
      );

      return {
        id: invitation.id,
        groupId: invitation.groupId,
        invitedUserId: invitation.invitedUserId,
        status: invitation.status,
        createdAt: invitation.createdAt
      };
    });
  }

  async function listInvitations(userId) {
    return withDb(db => db.all(
      `SELECT
         gi.id,
         gi.groupId,
         gi.invitedBy,
         gi.status,
         gi.createdAt,
         gi.respondedAt,
         g.name AS groupName
       FROM group_invitations gi
       JOIN groups g ON g.id = gi.groupId
       WHERE gi.invitedUserId = ?
       ORDER BY gi.createdAt DESC`,
      [userId]
    ));
  }

  async function acceptInvitation(userId, invitationId) {
    return withDb(async db => {
      await db.exec('BEGIN IMMEDIATE');

      try {
        const invitation = await db.get(
          `SELECT *
           FROM group_invitations
           WHERE id = ?
             AND invitedUserId = ?`,
          [invitationId, userId]
        );

        if (!invitation) {
          fail('NOT_FOUND', 'Einladung nicht gefunden.');
        }

        if (invitation.status !== 'pending') {
          fail(
            'CONFLICT',
            'Diese Einladung wurde bereits beantwortet.'
          );
        }

        const group = await db.get(
          'SELECT * FROM groups WHERE id = ?',
          [invitation.groupId]
        );

        if (!group) {
          fail('NOT_FOUND', 'Gruppe nicht gefunden.');
        }

        await db.run(
          `INSERT INTO group_members (groupId, userId)
           VALUES (?, ?)`,
          [invitation.groupId, userId]
        );

        const respondedAt = new Date().toISOString();

        await db.run(
          `UPDATE group_invitations
           SET status = 'accepted',
               respondedAt = ?
           WHERE id = ?`,
          [respondedAt, invitationId]
        );

        await db.exec('COMMIT');

        return {
          id: invitation.id,
          groupId: invitation.groupId,
          status: 'accepted',
          respondedAt
        };
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }
    });
  }

  async function declineInvitation(userId, invitationId) {
    return withDb(async db => {
      const invitation = await db.get(
        `SELECT *
         FROM group_invitations
         WHERE id = ?
           AND invitedUserId = ?`,
        [invitationId, userId]
      );

      if (!invitation) {
        fail('NOT_FOUND', 'Einladung nicht gefunden.');
      }

      if (invitation.status !== 'pending') {
        fail(
          'CONFLICT',
          'Diese Einladung wurde bereits beantwortet.'
        );
      }

      const respondedAt = new Date().toISOString();

      await db.run(
        `UPDATE group_invitations
         SET status = 'declined',
             respondedAt = ?
         WHERE id = ?`,
        [respondedAt, invitationId]
      );

      return {
        id: invitation.id,
        groupId: invitation.groupId,
        status: 'declined',
        respondedAt
      };
    });
  }

  return {
    createInvitation,
    listInvitations,
    acceptInvitation,
    declineInvitation
  };
}