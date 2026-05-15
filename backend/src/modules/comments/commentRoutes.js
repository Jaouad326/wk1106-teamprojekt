import express from 'express';
import crypto from 'crypto';

// Wir bauen hier eine "Fabrik" für die Routen, der wir später die Datenbank 
// und die Test-Helfer (Auth/Rechte) übergeben.
export function createCommentRouter(db, requireAuth, accessService) {
  // mergeParams: true ist wichtig, damit wir die Task-ID aus der URL lesen können
  const router = express.Router({ mergeParams: true });

  // 1. KOMMENTARE ABRUFEN (GET)
  router.get('/', requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      // Prüfen, ob der Benutzer diese Aufgabe überhaupt sehen darf?
      if (!accessService.canReadTask(userId, taskId)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Kein Zugriff auf diese Aufgabe' } });
      }

      // Kommentare werden aus der Datenbank geladen (chronologisch sortiert)
      const comments = await db.all(
        'SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt ASC, id ASC',
        [taskId]
      );

      res.json({ data: comments });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
    }
  });

  // 2. KOMMENTARE ERSTELLEN (POST)
  router.post('/', requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;
      let { body } = req.body;

      // Prüfen, ob der Benutzer hier kommentieren darf?
      if (!accessService.canWriteTask(userId, taskId)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Keine Berechtigung zum Kommentieren' } });
      }

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
      await db.run(
        'INSERT INTO comments (id, taskId, authorId, body, createdAt) VALUES (?, ?, ?, ?, ?)',
        [newComment.id, newComment.taskId, newComment.authorId, newComment.body, newComment.createdAt]
      );

      // Der fertige Kommentar wird an die Webseite zurückgeschickt
      res.status(201).json({ data: newComment });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
    }
  });

  return router;
}