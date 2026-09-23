import express from 'express';
import cors from 'cors';
import { getDbConnection } from './config/db.js';
import { createCommentRouter } from './modules/comments/commentRoutes.js';
import { createGroupRouter } from './modules/groups/groupRoutes.js';
import { createGroupService } from './modules/groups/groupService.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- TEMPORÄRE TEST-HELFER ---
const mockRequireAuth = (req, res, next) => {
 req.user = { id: 'test-user-1', email: 'test@thm.de' };
  next();
};
const mockAccessService = {
  canReadTask: (userId, taskId) => true,
  canWriteTask: (userId, taskId) => true
};
const mockUserDirectory = {
  async findVerifiedByEmail(email) {
    if (email === 'test@thm.de') {
      return {
        id: 'test-user-1',
        email: 'test@thm.de'
      };
    }

    if (email === 'mitglied@thm.de') {
      return {
        id: 'test-user-2',
        email: 'mitglied@thm.de'
      };
    }

    return null;
  }
};
// -----------------------------

app.get('/api/health', async (req, res) => {
  try {
    const db = await getDbConnection();
    await db.get('SELECT 1');
    await db.close();
    res.status(200).json({ data: { status: 'ok', database: 'connected' } });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'System health check failed' } });
  }
});

// Verbinden uns mit der Datenbank und starten dann den Server
getDbConnection().then(db => {
  // Wir übergeben der Fabrik unsere Datenbank und die Test-Helfer
  const commentRouter = createCommentRouter(db, mockRequireAuth, mockAccessService);
  const groupService = createGroupService(db, mockUserDirectory);
  const groupRouter = createGroupRouter(groupService, mockRequireAuth);
    
  app.use('/api/groups', groupRouter);  
  // Schalten die Route scharf. Die URL sieht dann z.B. so aus: /api/tasks/123/comments
  app.use('/api/tasks/:taskId/comments', commentRouter);
  
  app.listen(PORT, () => {
    console.log(`Backend läuft auf http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Konnte Datenbank nicht verbinden:', err);
});