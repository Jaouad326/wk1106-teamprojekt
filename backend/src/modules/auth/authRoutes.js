import express from 'express';
import { createHash } from 'node:crypto';
import { AuthError } from './authError.js';

export const asyncRoute = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function createRequireAuth(sessions) {
  return asyncRoute(async (req, res, next) => {
    const user = await sessions.getUser(req);
    if (!user) {
      sessions.clearCookie(res);
      throw new AuthError('UNAUTHORIZED', 'Bitte melde dich an.', 401);
    }
    req.user = user;
    next();
  });
}

// Verhindert fremde Formulare und Cross-Origin-Aufrufe aller schreibenden APIs.
export function protectWrites(appOrigin) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('origin') !== appOrigin || req.get('x-studyprio-request') !== '1') {
      return next(new AuthError('FORBIDDEN', 'Diese Anfrage ist nicht erlaubt.', 403));
    }
    if (!req.is('application/json')) {
      return next(new AuthError('UNSUPPORTED_MEDIA_TYPE', 'Bitte JSON senden.', 415));
    }
    next();
  };
}

export function createAuthRouter({ service, repository, sessions, localMail, now = () => new Date() }) {
  const router = express.Router();
  const windowMs = 15 * 60 * 1000;
  async function limit(res, key, max) {
    const keyHash = createHash('sha256').update(key).digest('hex');
    const at = now().getTime();
    const result = await repository.takeAttempt(keyHash, at, windowMs);
    if (result.hits > max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((result.expiresAt - at) / 1000))));
      throw new AuthError('TOO_MANY_REQUESTS', 'Zu viele Versuche. Bitte warte einige Minuten.', 429);
    }
  }
  router.get('/config', (req, res) => res.json({ data: { localMail } }));
  router.post('/request-link', asyncRoute(async (req, res) => {
    await limit(res, `request:${req.ip}`, 30);
    const email = req.body?.email;
    if (typeof email === 'string' && email.length <= 254) {
      await limit(res, `mail:${email.trim().toLowerCase()}`, 3);
    }
    const result = await service.requestLoginLink(email);
    res.status(202).json({ data: localMail
      ? { message: 'Lokaler Test: Den Anmeldelink findest du im Backend-Terminal.' }
      : result });
  }));
  router.post('/verify', asyncRoute(async (req, res) => {
    await limit(res, `verify:${req.ip}`, 30);
    const session = sessions.prepare(req);
    const user = await service.verifyLoginToken(req.body?.token, session.record);
    sessions.setCookie(res, session.token);
    res.json({ data: user });
  }));
  router.get('/me', createRequireAuth(sessions), (req, res) => res.json({ data: req.user }));
  router.post('/logout', asyncRoute(async (req, res) => {
    await sessions.logout(req, res);
    res.status(204).end();
  }));
  return router;
}
