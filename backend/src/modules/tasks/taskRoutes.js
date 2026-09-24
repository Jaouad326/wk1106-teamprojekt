import express from 'express';

export function createTaskRouter({ taskService, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);
  router.get('/', async (req, res, next) => {
    try {
      const unknown = Object.keys(req.query).filter(key => key !== 'status');
      if (unknown.length) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Nur der Statusfilter wird unterstützt.' } });
      res.json({ data: await taskService.list(req.user.id, req.query.status) });
    } catch (error) { next(error); }
  });
  router.get('/:id', async (req, res, next) => { try { res.json({ data: await taskService.get(req.user.id, req.params.id) }); } catch (error) { next(error); } });
  router.post('/', async (req, res, next) => { try { res.status(201).json({ data: await taskService.create(req.user.id, req.body) }); } catch (error) { next(error); } });
  router.patch('/:id', async (req, res, next) => { try { res.json({ data: await taskService.update(req.user.id, req.params.id, req.body) }); } catch (error) { next(error); } });
  router.delete('/:id', async (req, res, next) => { try { res.json({ data: await taskService.remove(req.user.id, req.params.id) }); } catch (error) { next(error); } });
  return router;
}
