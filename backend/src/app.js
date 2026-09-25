import express from 'express';
import path from 'node:path';
import { createAuthRepository } from './modules/auth/authRepository.js';
import { createAuthService } from './modules/auth/authService.js';
import { createSessionService } from './modules/auth/sessionService.js';
import { createAuthRouter, createRequireAuth, protectWrites, asyncRoute } from './modules/auth/authRoutes.js';
import { AuthError } from './modules/auth/authError.js';
import { createGroupRouter } from './modules/groups/groupRoutes.js';
import { createGroupService } from './modules/groups/groupService.js';
import { createAccessService } from './access/accessService.js';
import { createTaskModule } from './modules/tasks/taskModule.js';
import { createCommentRouter } from './modules/comments/commentRoutes.js';
import { createGroupInvitationService } from './modules/groups/groupInvitationService.js';

export function createApp({ openDb, config, mailer, now = () => new Date(), mountFeatures = () => ({}), frontendDirectory }) {
  const repository = createAuthRepository({ openDb });
  const service = createAuthService({ repository, mailer, ...config, now });
  const sessions = createSessionService({ repository, secure: config.secure, now });
  const requireAuth = createRequireAuth(sessions);
  const app = express();
  app.disable('x-powered-by');
  // Kein trust proxy: X-Forwarded-For darf die Ratenlimits nicht umgehen.
  app.use('/api', (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  app.use('/api', protectWrites(config.allowedOrigins ?? config.appOrigin));
  app.use(express.json({ limit: '8kb' }));
  app.get('/api/health', asyncRoute(async (req, res) => {
    const db = await openDb();
    try { await db.get('SELECT 1'); } finally { await db.close(); }
    res.json({ data: { status: 'ok', database: 'connected' } });
  }));
  app.use('/api/auth', createAuthRouter({ service, repository, sessions, now, localMail: config.mailMode === 'local' }));
  const userDirectory = { findVerifiedByEmail: service.findVerifiedByEmail };
const groupService = createGroupService({ openDb, userDirectory });
const invitationService = createGroupInvitationService({ openDb, userDirectory });

app.use('/api/groups', createGroupRouter({
  groupService,
  requireAuth,
  invitationService
}));
  const taskModule = createTaskModule({ openDb, requireAuth, accessService: createAccessService({ openDb }) });
  app.use('/api/tasks', taskModule.taskRouter);
  app.use('/api/tasks/:taskId/comments', createCommentRouter({ openDb, requireAuth, taskService: taskModule.taskService }));
  // Team-Routen hier einhängen, bevor Fallback und Fehlerbehandlung folgen.
  const features = mountFeatures(app, { openDb, requireAuth, userDirectory });
  if (features?.then) throw new TypeError('mountFeatures muss synchron sein. Datenbankverbindungen vorher öffnen.');
  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Nicht gefunden.' } }));
  if (frontendDirectory) {
    // Nur den gebauten Client ausliefern, niemals Backend, .env oder Datenbank.
    const directory = path.resolve(frontendDirectory);
    app.get(['/', '/auth/verify'], (req, res) => {
      res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
      res.sendFile(path.join(directory, 'index.html'));
    });
    app.use(express.static(directory, { index: false, dotfiles: 'deny' }));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof AuthError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Ungültiges JSON.' } });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Die Anfrage ist zu groß.' } });
    if (typeof error.status === 'number' && error.status >= 400 && error.status < 600) {
      const message = error.code ? error.message : 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
      return res.status(error.status).json({ error: { code: error.code || 'ERROR', message, ...(error.fields ? { fields: error.fields } : {}) } });
    }
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.' } });
  });
  return { app, repository, requireAuth, userDirectory, features };
}
