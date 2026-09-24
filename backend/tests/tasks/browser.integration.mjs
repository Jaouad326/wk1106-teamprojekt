// Läuft gegen die separate lokale Testansicht, nicht gegen ein Produktivsystem.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TASK_PREVIEW_URL || 'http://127.0.0.1:5174';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Browserprüfung nur auf localhost.');
let preview;
if (process.argv.includes('--start-preview')) {
  preview = spawn(process.execPath, [fileURLToPath(new URL('./preview.mjs', import.meta.url))], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { preview.kill(); reject(new Error('Testansicht startet nicht.')); }, 20000);
    preview.once('exit', code => { clearTimeout(timeout); reject(new Error(`Testansicht beendet: ${code}`)); });
    preview.stdout.on('data', chunk => { if (chunk.toString().includes('TASK_PREVIEW_URL=')) { clearTimeout(timeout); resolve(); } });
  });
}
const browser = await chromium.launch({ headless: true,
  ...(process.env.TASK_CHROMIUM ? { executablePath: process.env.TASK_CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 }, timezoneId: 'Europe/Berlin' });
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const screenshots = process.env.TASK_SCREENSHOTS;
  if (screenshots) await mkdir(screenshots, { recursive: true });
  await page.goto(origin);
  await page.getByRole('heading', { name: 'Statistik: Übungsblatt abschließen' }).waitFor();
  if (screenshots) await page.screenshot({ path: path.join(screenshots, 'aufgaben-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: '+ Neue Aufgabe', exact: true }).click();
  await page.getByRole('button', { name: 'Aufgabe anlegen', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Bitte prüfe die markierten Felder' }).waitFor();
  await page.getByLabel('Titel *', { exact: true }).fill('Browserprüfung Aufgaben');
  await page.getByLabel('Beschreibung', { exact: true }).fill('Persistenz und Statuswechsel');
  await page.getByLabel('Fällig am *', { exact: true }).fill('2026-09-25T15:30');
  await page.getByLabel('Aufwand in Stunden *', { exact: true }).fill('0.75');
  await page.getByLabel('Zuordnung', { exact: true }).selectOption('study-group');
  await page.getByRole('button', { name: 'Aufgabe anlegen', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Aufgabe angelegt.' }).waitFor();
  const article = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Browserprüfung Aufgaben', exact: true }) });
  assert.ok((await article.textContent()).includes('Lerngruppe'));
  await page.reload();
  await page.getByRole('heading', { name: 'Browserprüfung Aufgaben', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Bearbeiten: Browserprüfung Aufgaben', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Status', { exact: true }).selectOption('done');
  const patchRequest = page.waitForRequest(request => request.method() === 'PATCH');
  await page.getByRole('button', { name: 'Änderungen speichern', exact: true }).click();
  assert.deepEqual((await patchRequest).postDataJSON(), { status: 'done' });
  await page.getByRole('status').filter({ hasText: 'Änderungen gespeichert.' }).waitFor();
  await page.locator('.tasks-toolbar').getByLabel('Status', { exact: true }).selectOption('done');
  assert.equal(await article.count(), 1);
  await page.getByRole('button', { name: 'Löschen: Browserprüfung Aufgaben', exact: true }).click();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  assert.equal(await article.count(), 1);
  await page.getByRole('button', { name: 'Löschen: Browserprüfung Aufgaben', exact: true }).click();
  await page.getByRole('button', { name: 'Endgültig löschen', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Aufgabe und zugehörige Kommentare gelöscht.' }).waitFor();
  assert.equal(await article.count(), 0);

  // Kein Scheinerfolg: Schreibfehler erhält den Dialog und die Eingaben.
  await page.locator('.tasks-toolbar').getByLabel('Status', { exact: true }).selectOption('all');
  await page.getByRole('button', { name: '+ Neue Aufgabe', exact: true }).click();
  await page.getByLabel('Titel *', { exact: true }).fill('Nicht gespeichert');
  await page.getByLabel('Fällig am *', { exact: true }).fill('2026-09-25T12:00');
  const failSave = route => route.request().method() === 'POST'
    ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Testfehler beim Speichern.' } }) }) : route.continue();
  await page.route('**/api/tasks', failSave);
  await page.getByRole('button', { name: 'Aufgabe anlegen', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Testfehler beim Speichern.' }).waitFor();
  assert.equal(await page.getByLabel('Titel *', { exact: true }).inputValue(), 'Nicht gespeichert');
  assert.equal(await page.getByRole('dialog').count(), 1);
  await page.unroute('**/api/tasks', failSave);
  await page.keyboard.press('Escape');

  // Lesefehler ist kein leerer Erfolg; Wiederholen lädt wieder echte Daten.
  const failLoad = route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Testfehler beim Laden.' } }) });
  await page.route('**/api/tasks', failLoad);
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Testfehler beim Laden.' }).waitFor();
  assert.equal(await page.locator('article').count(), 0);
  await page.unroute('**/api/tasks', failLoad);
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await page.getByRole('heading', { name: 'Statistik: Übungsblatt abschließen' }).waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (screenshots) await page.screenshot({ path: path.join(screenshots, 'aufgaben-mobil.png'), fullPage: true });
  await page.getByRole('button', { name: '+ Neue Aufgabe', exact: true }).click();
  assert.ok(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth));
  if (screenshots) await page.screenshot({ path: path.join(screenshots, 'formular-mobil.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.activeElement?.textContent === '+ Neue Aufgabe');
  assert.equal(await page.getByRole('button', { name: '+ Neue Aufgabe', exact: true }).evaluate(element => element === document.activeElement), true);
  assert.deepEqual(errors, []);
  console.log('Browserprüfung bestanden: Formularvalidierung, CRUD, Neuladen, Statusfilter, Löschabbruch/-bestätigung, Fehlerzustände, Tastaturfokus, Desktop/Mobil, keine JavaScript-Fehler.');
} finally { await browser.close(); if (preview) preview.kill('SIGTERM'); }
