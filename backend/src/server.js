import { getDbConnection } from './config/db.js';
import { readAuthConfig } from './config/authConfig.js';
import { createMailer } from './modules/auth/mailer.js';
import { createApp } from './app.js';

try {
  const config = readAuthConfig();
  const { app, repository } = createApp({ openDb: getDbConnection, config, mailer: createMailer(config) });
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
} catch {
  console.error('Start fehlgeschlagen. Bitte backend/.env prüfen und npm run migrate ausführen.');
  process.exitCode = 1;
}
