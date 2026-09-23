import express from 'express';
import { createAuthRepository } from './modules/auth/authRepository.js';
import { createAuthService } from './modules/auth/authService.js';
import { createSessionService } from './modules/auth/sessionService.js';
import { createAuthRouter, createRequireAuth, protectWrites, asyncRoute } from './modules/auth/authRoutes.js';
import { AuthError } from './modules/auth/authError.js';

export function createApp({ openDb, config, mailer, now = () => new Date() }) {
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
  app.use('/api', protectWrites(config.appOrigin));
  app.use(express.json({ limit: '8kb' }));
  app.get('/api/health', asyncRoute(async (req, res) => {
    const db = await openDb();
    try { await db.get('SELECT 1'); } finally { await db.close(); }
    res.json({ data: { status: 'ok', database: 'connected' } });
  }));
  app.use('/api/auth', createAuthRouter({ service, repository, sessions, now, localMail: config.mailMode === 'local' }));
  // Ahshans Router bleibt erhalten. Erst mit echten Aufgabenrechten wieder anbinden.
  app.use('/api/tasks/:taskId/comments', requireAuth, (req, res) => {
    res.status(503).json({ error: { code: 'COMMENTS_NOT_READY', message: 'Kommentare werden noch mit den Aufgabenrechten verbunden.' } });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Nicht gefunden.' } }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof AuthError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Ungültiges JSON.' } });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Die Anfrage ist zu groß.' } });
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.' } });
  });
  return { app, repository, requireAuth, userDirectory: { findVerifiedByEmail: service.findVerifiedByEmail } };
}
