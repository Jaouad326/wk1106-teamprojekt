import { createTaskRepository } from './taskRepository.js';
import { createTaskService } from './taskService.js';
import { createTaskRouter } from './taskRoutes.js';

export function createTaskModule({ openDb, requireAuth, accessService }) {
  const taskService = createTaskService({ repository: createTaskRepository({ openDb }), accessService });
  return { taskService, taskRouter: createTaskRouter({ taskService, requireAuth }) };
}
