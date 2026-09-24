import { readAuthConfig } from '../config/authConfig.js';
import { createMailer } from '../modules/auth/mailer.js';

try {
  const config = readAuthConfig();
  if (config.mailMode !== 'smtp') {
    console.error('MAIL_MODE ist local. Für den SMTP-Verbindungstest zuerst backend/.env einrichten.');
    process.exitCode = 1;
  } else {
    await createMailer(config).verifyConnection();
    console.log('SMTP-Verbindung und Anmeldung erfolgreich. Es wurde keine Mail versendet.');
    console.log('Danach einen Anmeldelink an das eigene Postfach anfordern und die Zustellung prüfen.');
  }
} catch {
  console.error('SMTP-Prüfung fehlgeschlagen. Host, Port, TLS und Versandkonto in backend/.env prüfen.');
  process.exitCode = 1;
}
