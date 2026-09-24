import { randomUUID } from 'node:crypto';
import { TaskError } from './taskError.js';
import { validateTaskInput, validateStatusFilter } from './taskValidation.js';

export function createTaskService({ repository, accessService, now = () => new Date(), createId = randomUUID }) {
  for (const method of ['canReadTask', 'canWriteTask', 'isGroupMember']) {
    if (typeof accessService?.[method] !== 'function') throw new TypeError(`AccessService.${method} fehlt.`);
  }
  function requireUser(userId) {
    if (typeof userId !== 'string' || !userId.trim()) throw new TaskError(401, 'UNAUTHENTICATED', 'Bitte melde dich an.');
  }
  async function permitted(userId, task, method) {
    if (task.groupId === null && task.ownerId !== userId) return false;
    if (task.groupId !== null && await accessService.isGroupMember(userId, task.groupId) !== true) return false;
    return await accessService[method](userId, task) === true;
  }
  async function accessible(repo, userId, id, method = 'canReadTask') {
    const task = await repo.findById(id);
    if (!task) throw new TaskError(404, 'TASK_NOT_FOUND', 'Diese Aufgabe existiert nicht.');
    if (!await permitted(userId, task, method)) throw new TaskError(403, 'FORBIDDEN', 'Du hast keinen Zugriff auf diese Aufgabe.');
    return task;
  }
  return {
    async listVisible(userId, { status } = {}) {
      requireUser(userId);
      validateStatusFilter(status);
      return repository.read(async repo => {
        const visible = [];
        for (const task of await repo.list(status)) {
          if (await permitted(userId, task, 'canReadTask')) visible.push(task);
        }
        return visible;
      });
    },
    async getVisibleById(userId, taskId) {
      requireUser(userId);
      return repository.read(repo => accessible(repo, userId, taskId));
    },
    async create(userId, input) {
      requireUser(userId);
      const values = validateTaskInput(input);
      return repository.write(async repo => {
        if (values.groupId !== null && await accessService.isGroupMember(userId, values.groupId) !== true) {
          throw new TaskError(403, 'FORBIDDEN', 'Du bist kein Mitglied dieser Gruppe.');
        }
        const timestamp = now().toISOString();
        return repo.insert({ ...values, id: createId(), ownerId: userId, createdAt: timestamp, updatedAt: timestamp });
      });
    },
    async update(userId, taskId, input) {
      requireUser(userId);
      return repository.write(async repo => {
        const task = await accessible(repo, userId, taskId, 'canWriteTask');
        const changes = validateTaskInput(input, { patch: true });
        return repo.update({ ...task, ...changes, updatedAt: now().toISOString() });
      });
    },
    async remove(userId, taskId) {
      requireUser(userId);
      return repository.write(async repo => {
        await accessible(repo, userId, taskId, 'canWriteTask');
        await repo.remove(taskId);
        return { id: taskId };
      });
    }
  };
}
