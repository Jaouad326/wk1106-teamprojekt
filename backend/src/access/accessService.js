export function createAccessService(db) {
  async function isGroupMember(userId, groupId) {
    const member = await db.get(
      `SELECT 1
       FROM group_members
       WHERE groupId = ? AND userId = ?`,
      [groupId, userId]
    );

    return Boolean(member);
  }

  async function isGroupOwner(userId, groupId) {
    const group = await db.get(
      `SELECT 1
       FROM groups
       WHERE id = ? AND ownerId = ?`,
      [groupId, userId]
    );

    return Boolean(group);
  }

  async function canReadTask(userId, task) {
    if (!task) {
      return false;
    }

    // Persönliche Aufgabe:
    // Nur der Besitzer darf darauf zugreifen.
    if (task.groupId === null || task.groupId === undefined) {
      return task.ownerId === userId;
    }

    // Gruppenaufgabe:
    // Aktuelle Gruppenmitgliedschaft entscheidet.
    return isGroupMember(userId, task.groupId);
  }

  async function canWriteTask(userId, task) {
    return canReadTask(userId, task);
  }

  return {
    isGroupMember,
    isGroupOwner,
    canReadTask,
    canWriteTask
  };
}