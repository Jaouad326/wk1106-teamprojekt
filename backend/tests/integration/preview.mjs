import { createServer } from '../../../frontend/node_modules/vite/dist/node/index.js';
import react from '../../../frontend/node_modules/@vitejs/plugin-react/dist/index.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { teamFixture } from './teamFixture.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
let live = false;
const fixture = await teamFixture({ onMail(message) {
  if (live) console.log(`TEST_LOGIN_LINK=${JSON.stringify(message)}`);
} });
let vite;
try {
  const owner = await fixture.login('owner@campus.example');
  const demo = await fixture.login('demo@campus.example');
  const group = await fixture.request('POST', '/groups', { name: 'Demo-Team' }, owner.cookie);
  await fixture.request('POST', `/groups/${group.data.id}/members`, { email: demo.data.email }, owner.cookie);
  await fixture.request('POST', '/tasks', { title: 'Integration prüfen', dueAt: '2026-09-25T15:00:00Z', importance: 3, difficulty: 2, effortHours: 1, groupId: group.data.id }, demo.cookie);
  vite = await createServer({ configFile: false, root: path.join(root, 'frontend/tests/integration'), plugins: [react()],
    resolve: { dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 5175, strictPort: true,
      fs: { allow: [root] }, proxy: { '/api': fixture.origin } }
  });
  await vite.listen(); live = true;
  console.log('TEAM_PREVIEW_URL=http://localhost:5175');
  console.log('Lokale Demo: demo@campus.example eingeben. Link aus TEST_LOGIN_LINK öffnen. Keine echten Mails.');
  await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
} finally { if (vite) await vite.close(); await fixture.close(); }
