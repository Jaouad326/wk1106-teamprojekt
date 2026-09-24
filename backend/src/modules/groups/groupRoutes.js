import express from 'express';

function statusFor(error) {
  return { BAD_REQUEST: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409 }[error.code] || 500;
}

function sendError(res, error) {
  res.status(statusFor(error)).json({
    error: { code: error.code || 'INTERNAL_SERVER_ERROR', message: error.message }
  });
}

export function createGroupRouter({ groupService, requireAuth }) {
  const router = express.Router();

  router.get('/', requireAuth, async (req, res) => {
    try { res.json({ data: await groupService.listGroups(req.user.id) }); }
    catch (error) { sendError(res, error); }
  });

  router.post('/', requireAuth, async (req, res) => {
    try { res.status(201).json({ data: await groupService.createGroup(req.user.id, req.body?.name) }); }
    catch (error) { sendError(res, error); }
  });

  router.get('/:groupId/members', requireAuth, async (req, res) => {
    try { res.json({ data: await groupService.listMembers(req.user.id, req.params.groupId) }); }
    catch (error) { sendError(res, error); }
  });

  router.post('/:groupId/members', requireAuth, async (req, res) => {
    try {
      res.status(201).json({ data: await groupService.addMember(req.user.id, req.params.groupId, req.body?.email) });
    } catch (error) { sendError(res, error); }
  });

  router.delete('/:groupId/members/:userId', requireAuth, async (req, res) => {
    try {
      await groupService.removeMember(req.user.id, req.params.groupId, req.params.userId);
      res.status(204).end();
    } catch (error) { sendError(res, error); }
  });

  return router;
}
