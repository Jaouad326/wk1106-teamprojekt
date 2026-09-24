// Echter Browserablauf mit unveränderten Auth-/Gruppenmodulen, nur der Mailversand ist ein Testtransport.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const { chromium, request } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://localhost:5175';
const waiting = new Map();
function nextLink(email) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { waiting.delete(email); reject(new Error('Kein Test-Anmeldelink angekommen.')); }, 10000);
    waiting.set(email, message => { clearTimeout(timeout); waiting.delete(email); resolve(message.url); });
  });
}
const preview = spawn(process.execPath, [fileURLToPath(new URL('./teamPreview.mjs', import.meta.url))], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser, admin;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Team-Prüfstart fehlgeschlagen.')), 20000);
    preview.once('exit', code => { clearTimeout(timeout); reject(new Error(`Team-Prüfstart beendet: ${code}`)); });
    let buffer = '';
    preview.stdout.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\n'); buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('TEAM_PREVIEW_URL=')) { clearTimeout(timeout); resolve(); }
        if (line.startsWith('TEST_LOGIN_LINK=')) {
          const message = JSON.parse(line.slice('TEST_LOGIN_LINK='.length));
          waiting.get(message.email)?.(message);
        }
      }
    });
  });
  browser = await chromium.launch({ headless: true,
    ...(process.env.TASK_CHROMIUM ? { executablePath: process.env.TASK_CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, timezoneId: 'Europe/Berlin', locale: 'de-DE' });
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/team.html`);
  await page.getByLabel('Hochschul-E-Mail', { exact: true }).fill('amin-test@campus.example');
  const link = nextLink('amin-test@campus.example');
  await page.getByRole('button', { name: 'Anmeldelink anfordern', exact: true }).click();
  await page.goto(await link);
  await page.getByRole('button', { name: 'Anmeldung bestätigen', exact: true }).click();
  await page.getByRole('heading', { name: 'Persönliche Prüfung', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Gemeinsame Gruppenaufgabe', exact: true }).waitFor();
  await page.getByRole('button', { name: '+ Neue Aufgabe', exact: true }).click();
  await page.getByLabel('Titel *', { exact: true }).fill('Amins integrierte Aufgabe');
  await page.getByLabel('Fällig am *', { exact: true }).fill('2026-09-25T16:00');
  await page.getByLabel('Zuordnung', { exact: true }).selectOption({ label: 'StudyPrio Testgruppe' });
  await page.getByRole('button', { name: 'Aufgabe anlegen', exact: true }).click();
  await page.getByRole('heading', { name: 'Amins integrierte Aufgabe', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Amins integrierte Aufgabe', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Bearbeiten: Amins integrierte Aufgabe', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Status', { exact: true }).selectOption('done');
  await page.getByRole('button', { name: 'Änderungen speichern', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Änderungen gespeichert.' }).waitFor();
  const screenshots = process.env.TASK_SCREENSHOTS;
  if (screenshots) { await mkdir(screenshots, { recursive: true }); await page.screenshot({ path: path.join(screenshots, 'team-desktop.png'), fullPage: true }); }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (screenshots) await page.screenshot({ path: path.join(screenshots, 'team-mobil.png'), fullPage: true });

  // Besitzer meldet sich in unabhängiger Session an und entfernt das UI-Konto.
  admin = await request.newContext({ baseURL: origin, extraHTTPHeaders: { origin, 'Content-Type': 'application/json', 'X-StudyPrio-Request': '1' } });
  const ownerLink = nextLink('owner@campus.example');
  assert.equal((await admin.post('/api/auth/request-link', { data: { email: 'owner@campus.example' } })).status(), 202);
  const token = new URLSearchParams(new URL(await ownerLink).hash.slice(1)).get('token');
  assert.equal((await admin.post('/api/auth/verify', { data: { token } })).status(), 200);
  const groupId = (await (await admin.get('/api/groups')).json()).data[0].id;
  const memberId = (await (await page.request.get(`${origin}/api/auth/me`)).json()).data.id;
  // Offener Dialog enthält noch eine alte Task; der Server muss die Änderung dennoch verhindern.
  await page.getByRole('button', { name: 'Bearbeiten: Amins integrierte Aufgabe', exact: true }).click();
  await page.getByLabel('Titel *', { exact: true }).fill('Verbotene Änderung');
  assert.equal((await admin.delete(`/api/groups/${groupId}/members/${memberId}`, { data: {} })).status(), 204);
  await page.getByRole('button', { name: 'Änderungen speichern', exact: true }).click();
  await page.getByRole('dialog').getByRole('alert').filter({ hasText: 'Du hast keinen Zugriff' }).waitFor();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'Amins integrierte Aufgabe', exact: true }).count(), 0);
  assert.equal(await page.getByRole('heading', { name: 'Gemeinsame Gruppenaufgabe', exact: true }).count(), 0);
  await page.getByRole('button', { name: '+ Neue Aufgabe', exact: true }).click();
  assert.equal(await page.getByLabel('Zuordnung', { exact: true }).locator('option').count(), 1);
  await page.keyboard.press('Escape');

  // Gruppenladefehler darf persönliche Aufgaben nicht blockieren; erneutes Laden erholt sich.
  const failGroups = route => route.fulfill({ status: 503, contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Testfehler Gruppenliste.' } }) });
  await page.route('**/api/groups', failGroups);
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Testfehler Gruppenliste.' }).waitFor();
  await page.getByRole('heading', { name: 'Persönliche Prüfung', exact: true }).waitFor();
  await page.unroute('**/api/groups', failGroups);
  assert.equal((await admin.post(`/api/groups/${groupId}/members`, { data: { email: 'amin-test@campus.example' } })).status(), 201);
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await page.getByRole('heading', { name: 'Amins integrierte Aufgabe', exact: true }).waitFor();
  assert.equal(await page.getByRole('alert').count(), 0);

  // Wird die Gruppe bei offener Neuanlage entzogen, bleibt die ungültige Auswahl erkennbar.
  await page.locator('.tasks-toolbar').getByLabel('Status', { exact: true }).selectOption('done');
  await page.getByRole('button', { name: '+ Neue Aufgabe', exact: true }).click();
  await page.getByLabel('Titel *', { exact: true }).fill('Bewusst persönliche Aufgabe');
  await page.getByLabel('Fällig am *', { exact: true }).fill('2026-09-25T17:00');
  await page.getByLabel('Zuordnung', { exact: true }).selectOption(groupId);
  assert.equal((await admin.delete(`/api/groups/${groupId}/members/${memberId}`, { data: {} })).status(), 204);
  await page.getByRole('button', { name: 'Aufgabe anlegen', exact: true }).click();
  await page.getByText('Die gewählte Gruppe ist nicht mehr verfügbar. Bitte wähle eine andere Zuordnung.', { exact: true }).waitFor();
  const assignment = page.getByLabel('Zuordnung', { exact: true });
  assert.equal(await assignment.inputValue(), groupId);
  assert.equal(await assignment.locator('option:checked').textContent(), 'Gruppe nicht mehr verfügbar');
  await page.getByRole('button', { name: 'Aufgabe anlegen', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Bitte prüfe die markierten Felder.' }).waitFor();
  // Erst die ausdrückliche Auswahl macht daraus eine persönliche Aufgabe.
  await assignment.selectOption('');
  await page.getByRole('button', { name: 'Aufgabe anlegen', exact: true }).click();
  await page.getByRole('heading', { name: 'Bewusst persönliche Aufgabe', exact: true }).waitFor();
  assert.equal(await page.locator('.tasks-toolbar').getByLabel('Status', { exact: true }).inputValue(), 'all');
  const personal = (await (await page.request.get(`${origin}/api/tasks`)).json()).data.find(task => task.title === 'Bewusst persönliche Aufgabe');
  assert.equal(personal.groupId, null);
  // Persönliche Task bleibt bearbeitbar, DELETE läuft durch Jaouads echten Client.
  await page.getByRole('button', { name: 'Löschen: Persönliche Prüfung', exact: true }).click();
  await page.getByRole('button', { name: 'Endgültig löschen', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Aufgabe und zugehörige Kommentare gelöscht.' }).waitFor();
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await page.getByRole('button', { name: 'Anmeldelink anfordern', exact: true }).waitFor();
  assert.equal((await page.request.get(`${origin}/api/tasks`)).status(), 401);
  assert.deepEqual(errors, []);
  console.log('Team-Browserprüfung bestanden: echte AuthGate-Anmeldung, eigener API-Client, echte Gruppenliste, Aufgaben-CRUD, Neuladen, entfernter Ersteller, gesperrtes Speichern bei offenem Dialog, Gruppenladefehler/Erholung, Gruppenentzug bei Neuanlage, ausdrücklicher Wechsel zu persönlich, neue Aufgabe trotz vorherigem Statusfilter sichtbar, Logout, Desktop/Mobil.');
} finally {
  if (admin) await admin.dispose();
  if (browser) await browser.close();
  preview.kill('SIGTERM');
}
