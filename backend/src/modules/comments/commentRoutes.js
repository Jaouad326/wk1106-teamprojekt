import express from 'express';
import { randomUUID } from 'node:crypto';

function statusFor(error) { return typeof error.status === 'number' ? error.status : 500; }
function sendError(res, error) {
  const status = statusFor(error);
  // Nur eigene, klassifizierte Fehler (mit .code) zeigen ihre Meldung an; alles andere bleibt generisch.
  const message = error.code ? error.message : 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
  res.status(status).json({ error: { code: error.code || 'INTERNAL_SERVER_ERROR', message } });
}

// mergeParams: true, damit :taskId aus der Eltern-Route verfügbar ist.
// Sichtbarkeit/Schreibrecht werden über taskService geprüft, nicht doppelt hier.
export function createCommentRouter({ openDb, requireAuth, taskService }) {
  const router = express.Router({ mergeParams: true });
  router.use(requireAuth);

  router.get('/', async (req, res) => {
    try {
      await taskService.get(req.user.id, req.params.taskId);
      const db = await openDb();
      try {
        const comments = await db.all(
          'SELECT id, taskId, authorId, body, createdAt FROM comments WHERE taskId = ? ORDER BY createdAt ASC, id ASC',
          [req.params.taskId]
        );
        res.json({ data: comments });
      } finally { await db.close(); }
    } catch (error) { sendError(res, error); }
  });

  router.post('/', async (req, res) => {
    try {
      await taskService.assertWritable(req.user.id, req.params.taskId);
      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
      if (!body || body.length > 1000) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Kommentar muss zwischen 1 und 1000 Zeichen lang sein.' } });
      }
      const comment = { id: randomUUID(), taskId: req.params.taskId, authorId: req.user.id, body, createdAt: new Date().toISOString() };
      const db = await openDb();
      try {
        await db.run('INSERT INTO comments (id, taskId, authorId, body, createdAt) VALUES (?, ?, ?, ?, ?)',
          [comment.id, comment.taskId, comment.authorId, comment.body, comment.createdAt]);
      } finally { await db.close(); }
      res.status(201).json({ data: comment });
    } catch (error) { sendError(res, error); }
  });

  return router;
}