// Optional: Playwright/Chromium separat installieren, keine Produktivabhängigkeit.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const child = spawn(process.execPath, [fileURLToPath(new URL('./preview.mjs', import.meta.url))], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser, latestLink;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Prüfserver startet nicht.')), 15000);
    child.once('exit', () => { clearTimeout(timeout); reject(new Error('Prüfserver beendet.')); });
    let buffer = '';
    child.stdout.on('data', chunk => {
      buffer += chunk; const lines = buffer.split('\n'); buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('TEST_LOGIN_LINK=')) latestLink = JSON.parse(line.slice('TEST_LOGIN_LINK='.length)).url;
        if (line.startsWith('TEAM_PREVIEW_URL=')) { clearTimeout(timeout); resolve(); }
      }
    });
  });
  browser = await chromium.launch({ headless: true, ...(process.env.STUDYPRIO_CHROMIUM ? {
    executablePath: process.env.STUDYPRIO_CHROMIUM,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote']
  } : {}) });
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 }, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5175');
  async function login() {
    latestLink = null;
    await page.getByLabel('Hochschul-E-Mail', { exact: true }).fill('demo@campus.example');
    await page.getByRole('button', { name: 'Anmeldelink anfordern', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Backend-Terminal' }).waitFor();
    assert.ok(latestLink);
    const link = latestLink;
    await page.goto(link);
    await page.getByRole('button', { name: 'Anmeldung bestätigen', exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    assert.equal((await page.request.get('http://localhost:5175/api/auth/me')).status(), 401);
    await page.getByRole('button', { name: 'Anmeldung bestätigen', exact: true }).click();
    await page.locator('.profile-summary').filter({ hasText: 'demo@campus.example' }).waitFor();
    await page.locator('.task-list').getByRole('heading', { name: 'Integration prüfen', exact: true }).waitFor();
    return link;
  }
  const firstLink = await login();
  // Eine gerade angelegte Gruppe muss ohne Neuladen für Aufgaben auswählbar sein.
  await page.getByPlaceholder('Neue Gruppe', { exact: true }).fill('Browsergruppe');
  await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
  const tasks = page.getByRole('region', { name: 'Aufgabenplanung', exact: true });
  await tasks.locator('.task-create-form label').filter({ hasText: /^Gruppe/ }).locator('select').selectOption({ label: 'Browsergruppe' });
  await tasks.getByPlaceholder('Titel', { exact: true }).fill('Browserprüfung');
  await tasks.getByLabel('Fällig', { exact: true }).fill('2026-10-05T16:00');
  await tasks.getByRole('button', { name: 'Aufgabe hinzufügen', exact: true }).click();
  const item = tasks.locator('.task-item').filter({ hasText: 'Browserprüfung' });
  await item.getByRole('heading', { name: 'Browserprüfung', exact: true }).waitFor();
  const stored = async () => (await (await page.request.get('http://localhost:5175/api/tasks')).json()).data.find(task => task.title === 'Browserprüfung');
  const beforeEdit = await stored();
  assert.equal(beforeEdit.dueAt, '2026-10-05T14:00:00.000Z');
  await item.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  const editing = tasks.locator('.is-editing');
  assert.equal(await editing.getByLabel('Fällig', { exact: true }).inputValue(), '2026-10-05T16:00');
  await editing.getByPlaceholder('Beschreibung (optional)').fill('Termin bleibt gleich');
  await editing.getByRole('button', { name: 'Speichern', exact: true }).click();
  await item.getByText('Termin bleibt gleich', { exact: true }).waitFor();
  assert.equal((await stored()).dueAt, beforeEdit.dueAt);
  await item.getByRole('button', { name: 'Kommentare', exact: true }).click();
  await item.getByLabel('Neuer Kommentar', { exact: true }).fill('Integration klappt');
  await item.getByRole('button', { name: 'Kommentar senden', exact: true }).click();
  await item.getByText('Integration klappt', { exact: true }).waitFor();
  await page.reload();
  await item.getByRole('heading', { name: 'Browserprüfung', exact: true }).waitFor();
  await item.getByRole('button', { name: 'Kommentare', exact: true }).click();
  await item.getByText('Integration klappt', { exact: true }).waitFor();
  const screenshotDir = process.env.STUDYPRIO_SCREENSHOTS;
  if (screenshotDir) { await mkdir(screenshotDir, { recursive: true }); await page.screenshot({ path: path.join(screenshotDir, 'team-desktop.png'), fullPage: true }); }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, 'team-mobile.png'), fullPage: true });
  // Sitzung serverseitig beenden, während die Aufgabenansicht noch offen ist.
  assert.equal((await page.request.post('http://localhost:5175/api/auth/logout', { data: {}, headers: {
    Origin: 'http://localhost:5175', 'X-StudyPrio-Request': '1'
  } })).status(), 204);
  await item.locator('.task-actions select').selectOption('done');
  await page.getByRole('alert').filter({ hasText: 'Sitzung ist abgelaufen' }).waitFor();
  await login();
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await page.getByRole('button', { name: 'Jetzt abmelden', exact: true }).click();
  await page.getByLabel('Hochschul-E-Mail', { exact: true }).waitFor();
  assert.equal((await page.request.get('http://localhost:5175/api/tasks')).status(), 401);
  await page.goto(firstLink);
  await page.getByRole('button', { name: 'Anmeldung bestätigen', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'ungültig oder abgelaufen' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Browserprüfung bestanden: Login, explizite Bestätigung, useAuth, Gruppe anlegen, Aufgabe zuordnen, Bearbeiten ohne Zeitverschiebung, Kommentare, Reload, Sitzungsende, erneuter Login, Logout, Linkwiederverwendung, Desktop/Mobil.');
} finally {
  if (browser) await browser.close();
  child.kill('SIGTERM');
  await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
}
