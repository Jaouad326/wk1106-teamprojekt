// Optionaler Browser-Gesamttest: echte lokale API, isolierte DB, keine echten E-Mails.
import assert from 'node:assert/strict';
import { createServer } from '../../../frontend/node_modules/vite/dist/node/index.js';
import react from '../../../frontend/node_modules/@vitejs/plugin-react/dist/index.js';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { teamFixture } from './teamFixture.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const f = await teamFixture();
let vite, browser;
try {
  const first = await f.login('first@campus.example'); const second = await f.login('second@campus.example');
  vite = await createServer({ configFile: false, root: fileURLToPath(new URL('../../../frontend', import.meta.url)), plugins: [react()],
    server: { host: '127.0.0.1', port: 5175, strictPort: true, proxy: { '/api': f.origin } } });
  await vite.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.STUDYPRIO_CHROMIUM ? { executablePath: process.env.STUDYPRIO_CHROMIUM,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process', '--no-zygote'] } : {}) });
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, locale: 'de-DE' });
  page.setDefaultTimeout(10000); const errors = []; page.on('pageerror', error => errors.push(error.message));
  async function signIn(account) {
    await page.context().clearCookies();
    const [name, value] = account.cookie.split('=');
    await page.context().addCookies([{ name, value, url: 'http://localhost:5175', httpOnly: true, sameSite: 'Lax' }]);
    await page.goto('http://localhost:5175'); await page.locator('.dashboard-page').waitFor();
  }
  await signIn(first);
  // Beide Abmeldeknöpfe fragen nach, Abbrechen hält die Sitzung.
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.getByRole('dialog', { name: 'Wirklich abmelden?' }).waitFor();
  assert.equal((await f.request('GET', '/auth/me', undefined, first.cookie)).status, 200);
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  const focus = page.getByRole('region', { name: 'Fokusmodus', exact: true });
  await focus.getByRole('button', { name: /Zeiten anpassen/ }).click();
  await focus.getByLabel('Lernzeit (Min.)', { exact: true }).fill('42');
  await focus.getByLabel('Pause (Min.)', { exact: true }).fill('7');
  await focus.getByRole('button', { name: 'Zeiten übernehmen', exact: true }).click();
  assert.equal(await focus.getByLabel('Verbleibende Zeit').innerText(), '42:00');
  await page.reload(); await focus.waitFor();
  assert.equal(await focus.getByLabel('Verbleibende Zeit').innerText(), '42:00');
  await focus.getByRole('button', { name: /Zeiten anpassen/ }).click();
  await focus.getByLabel('Lernzeit (Min.)', { exact: true }).fill('1');
  await focus.getByRole('button', { name: 'Zeiten übernehmen', exact: true }).click();
  await page.clock.install();
  await focus.getByRole('button', { name: 'Starten', exact: true }).click();
  await page.clock.fastForward(61000);
  assert.equal(await focus.getByLabel('Verbleibende Zeit').innerText(), '07:00');
  await focus.getByRole('button', { name: 'Starten', exact: true }).waitFor();
  const groups = page.getByRole('region', { name: 'Gruppenverwaltung', exact: true });
  await groups.getByLabel('Neue Gruppe', { exact: true }).fill('Gemeinsam lernen');
  await groups.getByRole('button', { name: 'Erstellen', exact: true }).click();
  await groups.getByRole('heading', { name: 'Gemeinsam lernen', exact: true }).waitFor();
  if (process.env.STUDYPRIO_SCREENSHOTS) {
    await mkdir(process.env.STUDYPRIO_SCREENSHOTS, { recursive: true });
    await groups.screenshot({ path: `${process.env.STUDYPRIO_SCREENSHOTS}/flows-groups.png` });
  }
  const group = (await f.request('GET', '/groups', undefined, first.cookie)).data[0];
  const task = (await f.request('POST', '/tasks', { title: 'Aufgabe behalten', dueAt: '2026-12-01T12:00:00Z', importance: 3, difficulty: 2, effortHours: 1, groupId: group.id }, first.cookie)).data;
  await groups.getByLabel('E-Mail-Adresse einladen', { exact: true }).fill('second@campus.example');
  await groups.getByRole('button', { name: 'Einladen', exact: true }).click();
  await groups.getByRole('status').filter({ hasText: 'Einladung an' }).waitFor();
  assert.deepEqual((await f.request('GET', '/groups', undefined, second.cookie)).data, []);
  await signIn(second);
  await page.getByRole('button', { name: 'Gruppeneinladungen', exact: true }).click();
  await page.getByRole('button', { name: 'Ablehnen', exact: true }).click();
  await page.getByText('Keine Benachrichtigungen vorhanden.', { exact: true }).waitFor();
  assert.deepEqual((await f.request('GET', '/groups', undefined, second.cookie)).data, []);
  await f.request('POST', `/groups/${group.id}/invitations`, { email: second.data.email }, first.cookie);
  // Öffnen lädt sofort neu, ohne dass ein Reload nötig ist.
  await page.getByRole('button', { name: 'Einladungen schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Gruppeneinladungen', exact: true }).click();
  await page.getByRole('button', { name: 'Annehmen', exact: true }).click();
  await groups.getByRole('button', { name: /Gemeinsam lernen/ }).waitFor();
  await page.locator('.task-list').getByRole('heading', { name: 'Aufgabe behalten', exact: true }).waitFor();
  await signIn(first);
  await groups.getByRole('button', { name: /Gemeinsam lernen/ }).click();
  await groups.getByRole('button', { name: 'Gruppe verlassen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Gruppe verlassen?' });
  await dialog.locator('select').selectOption({ label: 'second@campus.example' });
  await dialog.getByRole('button', { name: 'Verlassen bestätigen', exact: true }).click();
  await groups.getByRole('status').filter({ hasText: 'Du hast die Gruppe verlassen' }).waitFor();
  assert.equal((await f.request('GET', `/tasks/${task.id}`, undefined, first.cookie)).status, 403);
  await signIn(second);
  await groups.getByRole('button', { name: /Gemeinsam lernen/ }).click();
  await groups.getByRole('button', { name: 'Gruppe verlassen', exact: true }).click();
  await dialog.getByText(/letzte Mitglied/).waitFor();
  await dialog.getByRole('button', { name: 'Verlassen bestätigen', exact: true }).click();
  await groups.getByRole('status').filter({ hasText: 'Gruppe aufgelöst' }).waitFor();
  assert.equal((await f.request('GET', `/tasks/${task.id}`, undefined, second.cookie)).data.groupId, null);
  if (process.env.STUDYPRIO_SCREENSHOTS) {
    await mkdir(process.env.STUDYPRIO_SCREENSHOTS, { recursive: true });
    await focus.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.env.STUDYPRIO_SCREENSHOTS}/flows-desktop.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (process.env.STUDYPRIO_SCREENSHOTS) {
    await focus.getByRole('button', { name: /Zeiten anpassen/ }).click();
    await focus.screenshot({ path: `${process.env.STUDYPRIO_SCREENSHOTS}/flows-mobile.png` });
  }
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  if (process.env.STUDYPRIO_SCREENSHOTS) await page.getByRole('dialog').screenshot({ path: `${process.env.STUDYPRIO_SCREENSHOTS}/flows-logout.png` });
  await page.getByRole('button', { name: 'Jetzt abmelden', exact: true }).click();
  await page.getByLabel('Hochschul-E-Mail', { exact: true }).waitFor();
  assert.equal((await f.request('GET', '/auth/me', undefined, second.cookie)).status, 401);
  assert.deepEqual(errors, []);
  console.log('Browser bestanden: Logout bestätigen/abbrechen, Timer speichern/Phase wechseln, Einladung ablehnen/annehmen, Gruppenleitung übergeben, letzte Gruppe verlassen, Aufgaben erhalten, Desktop/Mobil.');
} finally { if (browser) await browser.close(); if (vite) await vite.close(); await f.close(); }
