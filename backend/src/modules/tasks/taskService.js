import { randomUUID } from 'node:crypto';
import { calculateTaskPriority } from './taskPriority.js';
import { validateStatusFilter, validateTaskInput } from './taskValidation.js';

export function createTaskService({ repository, accessService, now = () => new Date() }) {
  const withPriority = task => task && { ...task, priority: calculateTaskPriority(task, now()) };
  const notFound = () => Object.assign(new Error('Aufgabe nicht gefunden.'), { status: 404, code: 'NOT_FOUND' });
  const forbidden = () => Object.assign(new Error('Kein Zugriff auf diese Aufgabe.'), { status: 403, code: 'FORBIDDEN' });
  async function permitted(userId, task, method = 'canReadTask') { return accessService[method](userId, task); }
  async function accessible(userId, id, method = 'canReadTask') {
    const task = await repository.findById(id);
    if (!task) throw notFound();
    if (!await permitted(userId, task, method)) throw forbidden();
    return task;
  }
  return {
    async list(userId, status) {
      validateStatusFilter(status);
      const candidates = await repository.list(userId, status);
      const visible = [];
      for (const task of candidates) {
        if (await permitted(userId, task, 'canReadTask')) visible.push(withPriority(task));
      }
      // Höchste Priorität zuerst; bei Gleichstand der nähere Termin.
      visible.sort((a, b) => b.priority.score - a.priority.score || new Date(a.dueAt) - new Date(b.dueAt));
      return visible;
    },
    async get(userId, id) { return withPriority(await accessible(userId, id, 'canReadTask')); },
    // Für Kommentare: dieselbe Regel wie beim Bearbeiten einer Aufgabe.
    async assertWritable(userId, id) { return withPriority(await accessible(userId, id, 'canWriteTask')); },
    async create(userId, input) {
      const values = validateTaskInput(input);
      let groupId = null;
      if (input.groupId !== undefined && input.groupId !== null && input.groupId !== '') {
        if (typeof input.groupId !== 'string') throw Object.assign(new Error('Ungültige Gruppen-ID.'), { status: 400, code: 'VALIDATION_ERROR' });
        if (!await accessService.isGroupMember(userId, input.groupId)) throw Object.assign(new Error('Du bist kein Mitglied dieser Gruppe.'), { status: 403, code: 'FORBIDDEN' });
        groupId = input.groupId;
      }
      const timestamp = now().toISOString();
      const task = await repository.insert({ ...values, description: values.description || '', status: 'open', groupId, id: randomUUID(), ownerId: userId, createdAt: timestamp, updatedAt: timestamp });
      return withPriority(task);
    },
    async update(userId, id, input) {
      const task = await accessible(userId, id, 'canWriteTask');
      const updated = await repository.update({ ...task, ...validateTaskInput(input, { patch: true }), updatedAt: now().toISOString() });
      return withPriority(updated);
    },
    async remove(userId, id) {
      await accessible(userId, id, 'canWriteTask');
      await repository.remove(id); return { id };
    }
  };
}
