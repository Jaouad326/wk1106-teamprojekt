import { createHash, randomBytes } from 'node:crypto';

export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const hash = token => createHash('sha256').update(token).digest('hex');

export function createSessionService({ repository, secure, now = () => new Date() }) {
  const cookieName = secure ? '__Host-studyprio_session' : 'studyprio_session';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' };

  function readToken(req) {
    const cookies = (req.headers.cookie || '').split(';').map(part => part.trim());
    const matches = cookies.filter(part => part.startsWith(`${cookieName}=`));
    if (matches.length !== 1) return null;
    const token = matches[0].slice(cookieName.length + 1);
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }

  return {
    prepare(req) {
      const token = randomBytes(32).toString('base64url');
      const previous = readToken(req);
      return { token, record: {
        tokenHash: hash(token), expiresAt: new Date(now().getTime() + SESSION_MS).toISOString(),
        previousHash: previous ? hash(previous) : null
      } };
    },
    setCookie(res, token) {
      res.cookie(cookieName, token, { ...cookieOptions, maxAge: SESSION_MS });
    },
    clearCookie(res) { res.clearCookie(cookieName, cookieOptions); },
    async getUser(req) {
      const token = readToken(req);
      return token ? repository.findSession(hash(token), now().toISOString()) : null;
    },
    async logout(req, res) {
      const token = readToken(req);
      if (token) await repository.deleteSession(hash(token));
      res.clearCookie(cookieName, cookieOptions);
    }
  };
}
