import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createTeamFixture } from './teamFixture.mjs';
import { validTask } from './fixture.js';

if (process.env.NODE_ENV === 'production') throw new Error('Team-Prüfstart ist nur lokal erlaubt.');
if (!process.env.TASK_AUTH_ROOT || !process.env.TASK_GROUPS_ROOT) throw new Error('Beide echten Team-Checkouts müssen angegeben werden.');
const frontend = fileURLToPath(new URL('../../../frontend/', import.meta.url));
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { createServer, build } = await import(pathToFileURL(path.join(path.dirname(frontendRequire.resolve('vite/package.json')), 'dist/node/index.js')));
const { default: react } = await import(pathToFileURL(path.join(path.dirname(frontendRequire.resolve('@vitejs/plugin-react')), 'index.js')));
const authFrontend = path.resolve(process.env.TASK_AUTH_ROOT, 'frontend');
const configuration = { configFile: false, root: path.join(frontend, 'tests/tasks'), plugins: [react()],
  resolve: { alias: { '@team-auth': path.join(authFrontend, 'src') }, dedupe: ['react', 'react-dom'] } };
configuration.plugins.push({ name: 'team-test-entry', configureServer(server) {
  server.middlewares.use((req, res, next) => {
    const pathname = req.url?.split('?')[0];
    if (pathname === '/' || pathname === '/auth/verify') req.url = '/team.html';
    next();
  });
} });
if (process.argv.includes('--build')) {
  if (!process.env.TASK_BUILD_OUT) throw new Error('Temporärer TASK_BUILD_OUT erforderlich.');
  await build({ ...configuration, build: { outDir: path.resolve(process.env.TASK_BUILD_OUT), emptyOutDir: true,
    rollupOptions: { input: path.join(frontend, 'tests/tasks/team.html') } } });
} else {
  let showMail = false;
  const fixture = await createTeamFixture({ onMail(message) { if (showMail) console.log(`TEST_LOGIN_LINK=${JSON.stringify(message)}`); } });
  const owner = await fixture.login('owner@campus.example');
  const member = await fixture.login('amin-test@campus.example');
  const group = await fixture.groupService.createGroup(owner.user.id, 'StudyPrio Testgruppe');
  await fixture.groupService.addMember(owner.user.id, group.id, 'amin-test@campus.example');
  await fixture.taskService.create(member.user.id, validTask({ title: 'Persönliche Prüfung', description: 'Diese Aufgabe gehört nur dem angemeldeten Testkonto.' }));
  await fixture.taskService.create(owner.user.id, validTask({ title: 'Gemeinsame Gruppenaufgabe', groupId: group.id }));
  showMail = true;
  const server = await createServer({ ...configuration, server: { host: '127.0.0.1', port: 5175, strictPort: true,
    fs: { allow: [frontend, authFrontend] }, proxy: { '/api': fixture.origin } } });
  await server.listen();
  console.log('TEAM_PREVIEW_URL=http://localhost:5175/team.html');
  console.log('Testkonto: amin-test@campus.example. Angeforderte Anmeldelinks erscheinen ausschließlich hier im Terminal.');
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await server.close(); await fixture.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
