import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, SESSION_EXPIRED_EVENT } from '../../../frontend/src/api.js';

test('Shared client sends JSON for DELETE and reports expired session to AuthGate', async t => {
  const oldFetch = globalThis.fetch;
  const oldWindow = globalThis.window;
  t.after(() => { globalThis.fetch = oldFetch; globalThis.window = oldWindow; });
  let sent, expired = 0;
  globalThis.window = new EventTarget();
  window.addEventListener(SESSION_EXPIRED_EVENT, () => expired++);
  globalThis.fetch = async (url, options) => {
    sent = { url, ...options };
    return new Response(null, { status: 204 });
  };
  assert.equal(await api('/groups/g/members/u', { method: 'delete' }), undefined);
  assert.equal(sent.body, '{}');
  assert.equal(sent.method, 'DELETE');
  assert.equal(sent.headers['X-StudyPrio-Request'], '1');
  globalThis.fetch = async () => new Response(JSON.stringify({ error: {
    code: 'VALIDATION_ERROR', message: 'Bitte Eingaben prüfen.', fields: { title: 'Titel fehlt.' }
  } }), { status: 400 });
  await assert.rejects(api('/tasks', { method: 'POST', body: {} }), {
    status: 400, code: 'VALIDATION_ERROR', fields: { title: 'Titel fehlt.' }
  });
  assert.equal(expired, 0);
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Bitte anmelden.' } }), { status: 401 });
  await assert.rejects(api('/tasks'), { status: 401, code: 'UNAUTHORIZED' });
  assert.equal(expired, 1);
  await assert.rejects(api('/auth/me'), { status: 401 });
  assert.equal(expired, 1);
});
