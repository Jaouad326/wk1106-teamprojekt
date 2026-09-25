import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../../src/app.js';

test('Gemeinsame Adresse liefert Build und Loginseite, aber keine privaten Dateien', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'studyprio-frontend-'));
  const dist = join(directory, 'dist');
  await mkdir(join(dist, 'assets'), { recursive: true });
  await writeFile(join(dist, 'index.html'), '<html>StudyPrio</html>');
  await writeFile(join(dist, 'assets', 'app.js'), 'console.log("StudyPrio");');
  await writeFile(join(directory, 'studyprio.sqlite'), 'private database');
  await writeFile(join(dist, '.env'), 'private environment');
  const { app } = createApp({
    openDb: async () => ({ get: async () => ({ ok: 1 }), close: async () => {} }),
    config: { appOrigin: 'https://team.example', secure: true, allowedDomains: ['campus.example'], mailMode: 'smtp' },
    mailer: { async sendLoginLink() {} }, frontendDirectory: dist
  });
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/', '/auth/verify']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(await response.text(), /StudyPrio/);
  }
  assert.equal((await fetch(base + '/assets/app.js')).status, 200);
  for (const path of ['/studyprio.sqlite', '/.env', '/package.json', '/src/server.js']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  const missing = await fetch(base + '/api/unknown');
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'NOT_FOUND');
  assert.equal((await fetch(base + '/api/health')).status, 200);
  const foreign = await fetch(base + '/api/auth/request-link', {
    method: 'POST', headers: { origin: 'https://other.example', 'content-type': 'application/json', 'x-studyprio-request': '1' },
    body: JSON.stringify({ email: 'a@campus.example' })
  });
  assert.equal(foreign.status, 403);
});
