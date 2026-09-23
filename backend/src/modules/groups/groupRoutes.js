import express from 'express';

export function createGroupRouter(groupService, requireAuth) {
  const router = express.Router();

  // Gruppe erstellen
  router.post('/', requireAuth, async (req, res) => {
    try {
      const group = await groupService.createGroup(
        req.user.id,
        req.body.name
      );

      res.status(201).json({ data: group });
    } catch (error) {
      const status =
        error.code === 'BAD_REQUEST' ? 400 :
        error.code === 'FORBIDDEN' ? 403 :
        error.code === 'NOT_FOUND' ? 404 :
        error.code === 'CONFLICT' ? 409 :
        500;

      res.status(status).json({
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message
        }
      });
    }
  });

  // Mitglied hinzufügen
  router.post('/:groupId/members', requireAuth, async (req, res) => {
    try {
      const member = await groupService.addMember(
        req.user.id,
        req.params.groupId,
        req.body.email
      );

      res.status(201).json({ data: member });
    } catch (error) {
      const status =
        error.code === 'BAD_REQUEST' ? 400 :
        error.code === 'FORBIDDEN' ? 403 :
        error.code === 'NOT_FOUND' ? 404 :
        error.code === 'CONFLICT' ? 409 :
        500;

      res.status(status).json({
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message
        }
      });
    }
  });

  // Mitglied entfernen
  router.delete('/:groupId/members/:userId', requireAuth, async (req, res) => {
    try {
      await groupService.removeMember(
        req.user.id,
        req.params.groupId,
        req.params.userId
      );

      res.status(204).send();
    } catch (error) {
      const status =
        error.code === 'BAD_REQUEST' ? 400 :
        error.code === 'FORBIDDEN' ? 403 :
        error.code === 'NOT_FOUND' ? 404 :
        500;

      res.status(status).json({
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message
        }
      });
    }
  });
   // Eigene Gruppen abrufen
  router.get('/', requireAuth, async (req, res) => {
    try {
      const groups = await groupService.listGroups(req.user.id);

      res.json({ data: groups });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        }
      });
    }
  });
  // Mitglieder einer Gruppe abrufen
router.get('/:groupId/members', requireAuth, async (req, res) => {
  try {
    const members = await groupService.listMembers(
      req.user.id,
      req.params.groupId
    );

    res.json({ data: members });
  } catch (error) {
    const status =
      error.code === 'FORBIDDEN' ? 403 :
      error.code === 'NOT_FOUND' ? 404 :
      500;

    res.status(status).json({
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message
      }
    });
  }
});

  // Eine einzelne Gruppe abrufen
  router.get('/:groupId', requireAuth, async (req, res) => {
    try {
      const group = await groupService.getGroup(
        req.user.id,
        req.params.groupId
      );

      res.json({ data: group });
    } catch (error) {
      const status = error.code === 'NOT_FOUND' ? 404 : 500;

      res.status(status).json({
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message
        }
      });
    }
  });
  return router;
}