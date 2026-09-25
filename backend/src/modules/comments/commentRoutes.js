import express from 'express';
import crypto from 'crypto';

function sendRouteError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({ error: {
    code: error.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR'),
    message: status === 500 ? 'Etwas ist schiefgelaufen. Bitte versuche es erneut.' : error.message
  } });
}

// Wir bauen hier eine "Fabrik" für die Routen, der wir später die Datenbank 
// und die Test-Helfer (Auth/Rechte) übergeben.
export function createCommentRouter({ openDb, requireAuth, taskService }) {
  // mergeParams: true ist wichtig, damit wir die Task-ID aus der URL lesen können
  const router = express.Router({ mergeParams: true });

  // 1. KOMMENTARE ABRUFEN (GET)
  router.get('/', requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      await taskService.get(userId, taskId);

      // Kommentare werden aus der Datenbank geladen (chronologisch sortiert)
      const db = await openDb();
      const comments = await db.all(
        'SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt ASC, id ASC',
        [taskId]
      );
      await db.close();

      res.json({ data: comments });
    } catch (error) { sendRouteError(res, error); }
  });

  // 2. KOMMENTARE ERSTELLEN (POST)
  router.post('/', requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;
      let { body } = req.body;

      await taskService.assertWritable(userId, taskId);

      // Prüfen, ob der Text zwischen 1 und 1000 Zeichen lang ist?
      body = body ? body.trim() : '';
      if (body.length < 1 || body.length > 1000) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Kommentar muss zwischen 1 und 1000 Zeichen lang sein.' } });
      }

      // Neuen Kommentar zusammenbauen
      const newComment = {
        id: crypto.randomUUID(), // Erzeugt eine sichere, zufällige ID
        taskId: taskId,
        authorId: userId,
        body: body,
        createdAt: new Date().toISOString()
      };

      // In der Datenbank speichern
      const db = await openDb();
      await db.run(
        'INSERT INTO comments (id, taskId, authorId, body, createdAt) VALUES (?, ?, ?, ?, ?)',
        [newComment.id, newComment.taskId, newComment.authorId, newComment.body, newComment.createdAt]
      );
      await db.close();

      // Der fertige Kommentar wird an die Webseite zurückgeschickt
      res.status(201).json({ data: newComment });
    } catch (error) { sendRouteError(res, error); }
  });
// Einen bestimmten Kommentar löschen
  router.delete('/:commentId', requireAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      await taskService.assertWritable(req.user.id, req.params.taskId);
      const db = await openDb();
      await db.run('DELETE FROM comments WHERE id = ?', [commentId]);
      await db.close();
      res.json({ message: 'Kommentar erfolgreich gelöscht' });
    } catch (error) { sendRouteError(res, error); }
  });
  return router;
}