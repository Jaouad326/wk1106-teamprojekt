export function readAuthConfig(env = process.env) {
  const origin = new URL(env.APP_ORIGIN || 'http://localhost:5173');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  const production = env.NODE_ENV === 'production';
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' ||
      (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && local)) ||
      (production && origin.protocol !== 'https:')) {
    throw new Error('APP_ORIGIN muss eine HTTPS-Adresse ohne Pfad sein (lokal auch HTTP).');
  }
  const allowedDomains = (env.ALLOWED_EMAIL_DOMAINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowedDomains.length) throw new Error('ALLOWED_EMAIL_DOMAINS fehlt. Siehe backend/.env.example.');
  const mailMode = env.MAIL_MODE;
  const publicLocalMail = env.ALLOW_PUBLIC_LOCAL_MAIL === 'true';
  if (!['local', 'smtp'].includes(mailMode) ||
      (mailMode === 'local' && (production || (!local && !publicLocalMail)))) {
    throw new Error('MAIL_MODE muss smtp sein; local ist nur lokal oder für eine ausdrücklich aktivierte Demo erlaubt.');
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Ungültiger PORT.');
  const smtpPort = Number(env.SMTP_PORT || 587);
  if (mailMode === 'smtp' && (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.MAIL_FROM ||
      ![465, 587].includes(smtpPort) || /[\r\n]/.test(env.MAIL_FROM))) {
    throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM und Port 465/587 werden benötigt.');
  }
  return {
    appOrigin: origin.origin,
    allowedOrigins: publicLocalMail
      ? [origin.origin, 'http://localhost:5173', 'http://127.0.0.1:5173']
      : [origin.origin],
    allowedDomains, mailMode, secure: origin.protocol === 'https:', port,
    // Lokale Testlinks dürfen nur auf dem eigenen Rechner zugänglich sein.
    host: mailMode === 'local' ? '127.0.0.1' : (env.HOST || '127.0.0.1'),
    smtp: { host: env.SMTP_HOST, port: smtpPort, user: env.SMTP_USER, pass: env.SMTP_PASS, from: env.MAIL_FROM }
  };
}
