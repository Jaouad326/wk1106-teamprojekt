export function createAccessService({ openDb }) {
  async function withDb(operation) {
    const db = await openDb();
    try { return await operation(db); }
    finally { await db.close(); }
  }

  async function isGroupMember(userId, groupId) {
    return withDb(async db => Boolean(await db.get(
      'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]
    )));
  }

  async function canReadTask(userId, task) {
    if (!task) return false;
    return task.groupId ? isGroupMember(userId, task.groupId) : task.ownerId === userId;
  }

  return {
    isGroupMember,
    isGroupOwner: (userId, groupId) => withDb(async db => Boolean(await db.get(
      'SELECT 1 FROM groups WHERE id = ? AND ownerId = ?', [groupId, userId]
    ))),
    canReadTask,
    canWriteTask: canReadTask
  };
}
