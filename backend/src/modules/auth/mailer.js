import nodemailer from 'nodemailer';

export function createMailer(config, { log = console.log, createTransport = nodemailer.createTransport } = {}) {
  if (config.mailMode === 'local') {
    return { async sendLoginLink({ url }) {
      log(`[NUR LOKAL – keine E-Mail versendet] Anmeldelink: ${url}`);
    } };
  }
  const smtp = config.smtp;
  const transport = createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.port === 465, requireTLS: true,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true
  });
  return { async sendLoginLink({ email, url }) {
    const result = await transport.sendMail({
      from: smtp.from, to: email, subject: 'Dein Anmeldelink für StudyPrio',
      text: `Hallo!\n\nÖffne diesen Link und bestätige dort deine Anmeldung:\n${url}\n\nDer Link gilt 15 Minuten und nur einmal. Falls du ihn nicht angefordert hast, ignoriere diese Mail.\n\nStudyPrio`
    });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('Mail wurde nicht angenommen.');
  } };
}
