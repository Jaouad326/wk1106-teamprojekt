import { getDbConnection } from './config/db.js';
import { readAuthConfig } from './config/authConfig.js';
import { createMailer } from './modules/auth/mailer.js';
import { createApp } from './app.js';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

try {
  const config = readAuthConfig();
  const frontendDirectory = process.env.SERVE_FRONTEND === 'true'
    ? fileURLToPath(new URL('../../frontend/dist/', import.meta.url)) : undefined;
  if (frontendDirectory) {
    try { await access(new URL('../../frontend/dist/index.html', import.meta.url)); }
    catch { throw Object.assign(new Error('Frontend fehlt.'), { code: 'FRONTEND_BUILD_MISSING' }); }
  }
  const { app, repository } = createApp({ openDb: getDbConnection, config, mailer: createMailer(config), frontendDirectory });
  await repository.ensureMailMode(config.mailMode);
  await repository.cleanup(new Date());
  const cleanup = setInterval(() => repository.cleanup(new Date()).catch(() => {
    console.error('Abgelaufene Anmeldedaten konnten nicht bereinigt werden.');
  }), 15 * 60 * 1000);
  cleanup.unref();
  const server = app.listen(config.port, config.host, () => {
    console.log(`Backend läuft auf http://${config.host}:${config.port}`);
    if (config.mailMode === 'local') console.log('Lokaler Testmodus: Es werden keine E-Mails versendet.');
  });
  server.on('error', () => { console.error('Backend konnte nicht gestartet werden. Ist der Port frei?'); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    clearInterval(cleanup);
    server.close();
  });
} catch (error) {
  console.error(error.code === 'FRONTEND_BUILD_MISSING'
    ? 'Start abgebrochen: Zuerst im Projektordner npm run build ausführen.'
    : error.code === 'AUTH_MAIL_MODE_MISMATCH'
    ? 'Start abgebrochen: Für echten Mailversand eine neue DATABASE_PATH wählen und migrieren. Testkonten werden nicht übernommen.'
    : 'Start fehlgeschlagen. Bitte backend/.env prüfen und npm run migrate ausführen.');
  process.exitCode = 1;
}
