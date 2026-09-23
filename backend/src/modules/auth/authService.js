import { createHash, randomBytes } from 'node:crypto';
import { AuthError } from './authError.js';

const LINK_LIFETIME_MS = 15 * 60 * 1000;
const hashToken = token => createHash('sha256').update(token).digest('hex');

export function createAuthService({ repository, mailer, allowedDomains, appOrigin,
  now = () => new Date() }) {
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0 ||
      allowedDomains.some(domain => typeof domain !== 'string' ||
        !/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/i.test(domain))) {
    throw new Error('Configure an explicit non-empty list of allowed email domains.');
  }
  const domains = new Set(allowedDomains.map(domain => domain.toLowerCase()));
  const origin = new URL(appOrigin);
  const isLocalHttp = origin.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if ((origin.protocol !== 'https:' && !isLocalHttp) || origin.username ||
      origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new Error('appOrigin must be an HTTPS origin (HTTP only for local development).');
  }
  if (typeof mailer?.sendLoginLink !== 'function') {
    throw new Error('A mailer.sendLoginLink adapter is required.');
  }

  function normalizeEmail(input) {
    if (typeof input !== 'string' || /[\r\n]/.test(input)) {
      throw new AuthError('INVALID_EMAIL', 'Bitte gib eine gültige Hochschul-E-Mail ein.');
    }
    const email = input.trim().toLowerCase();
    const parts = email.split('@');
    // Deliberately limited ASCII mailbox syntax for configured university domains.
    if (email.length > 254 || parts.length !== 2 || parts[0].length > 64 ||
        !/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(parts[0]) ||
        !domains.has(parts[1])) {
      throw new AuthError('INVALID_EMAIL', 'Bitte gib eine E-Mail einer zugelassenen Hochschuldomain ein.');
    }
    return email;
  }

  return {
    async requestLoginLink(input) {
      const email = normalizeEmail(input);
      const token = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(token);
      const createdAt = now();
      await repository.saveLoginToken({
        tokenHash, email, createdAt: createdAt.toISOString(),
        expiresAt: new Date(createdAt.getTime() + LINK_LIFETIME_MS).toISOString()
      });
      const url = new URL('/auth/verify', origin);
      // Das Fragment bleibt beim Laden lokal. Erst die Bestätigung sendet den
      // Token per POST; ein einfacher Linkabruf darf ihn nicht verbrauchen.
      url.hash = new URLSearchParams({ token }).toString();
      try {
        await mailer.sendLoginLink({ email, url: url.toString() });
      } catch {
        await repository.revokeLoginToken(tokenHash);
        throw new AuthError('MAIL_UNAVAILABLE', 'Der Anmeldelink konnte nicht versendet werden. Bitte versuche es später erneut.', 503);
      }
      // No token or account-existence disclosure to the requesting client.
      return { message: 'Bitte prüfe dein Postfach auf den Anmeldelink.' };
    },

    async verifyLoginToken(token, session) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
        throw new AuthError('INVALID_LOGIN_LINK', 'Der Anmeldelink ist ungültig oder abgelaufen.');
      }
      const user = await repository.consumeLoginToken(hashToken(token), now().toISOString(), session);
      if (!user) {
        throw new AuthError('INVALID_LOGIN_LINK', 'Der Anmeldelink ist ungültig oder abgelaufen.');
      }
      return user;
    },

    async findVerifiedByEmail(email) {
      return repository.findVerifiedByEmail(normalizeEmail(email));
    }
  };
}
