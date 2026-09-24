import express from 'express';
import { TaskError } from './taskError.js';

export function createTaskRouter({ taskService, requireAuth }) {
  if (typeof requireAuth !== 'function') throw new TypeError('Echte requireAuth-Middleware muss übergeben werden.');
  const router = express.Router();
  router.use(requireAuth);
  // Express 4 leitet verworfene Promises nicht automatisch weiter.
  const route = handler => (req, res, next) => Promise.resolve().then(() => handler(req, res)).catch(next);
  router.get('/', route(async (req, res) => {
    const unknown = Object.keys(req.query).filter(key => key !== 'status');
    if (unknown.length) throw new TaskError(400, 'VALIDATION_ERROR', 'Nur der Statusfilter wird unterstützt.');
    res.json({ data: await taskService.listVisible(req.user?.id, { status: req.query.status }) });
  }));
  router.get('/:id', route(async (req, res) => res.json({ data: await taskService.getVisibleById(req.user?.id, req.params.id) })));
  router.post('/', route(async (req, res) => {
    const task = await taskService.create(req.user?.id, req.body);
    res.location(`/api/tasks/${encodeURIComponent(task.id)}`).status(201).json({ data: task });
  }));
  router.patch('/:id', route(async (req, res) => res.json({ data: await taskService.update(req.user?.id, req.params.id, req.body) })));
  router.delete('/:id', route(async (req, res) => res.json({ data: await taskService.remove(req.user?.id, req.params.id) })));
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof TaskError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } });
    }
    next(error);
  });
  return router;
}
