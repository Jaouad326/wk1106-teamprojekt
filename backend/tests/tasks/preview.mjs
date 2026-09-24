// Nur localhost. Daten werden für diese Testausführung temporär gespeichert.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createFixture, validTask } from './fixture.js';

if (process.env.NODE_ENV === 'production') throw new Error('Testansicht ist im Produktionsmodus gesperrt.');
const frontend = fileURLToPath(new URL('../../../frontend/', import.meta.url));
const frontendRequire = createRequire(path.join(frontend, 'package.json'));
const { createServer, build } = await import(pathToFileURL(path.join(path.dirname(frontendRequire.resolve('vite/package.json')), 'dist/node/index.js')));
const { default: react } = await import(pathToFileURL(path.join(path.dirname(frontendRequire.resolve('@vitejs/plugin-react')), 'index.js')));
const configuration = { configFile: false, root: path.join(frontend, 'tests/tasks'), plugins: [react()] };
if (process.argv.includes('--build')) {
  if (!process.env.TASK_BUILD_OUT) throw new Error('TASK_BUILD_OUT muss auf einen temporären Ausgabeordner zeigen.');
  await build({ ...configuration, build: { outDir: path.resolve(process.env.TASK_BUILD_OUT), emptyOutDir: true } });
} else {
  const fixture = await createFixture();
  await fixture.service.create('alice', validTask({ title: 'Statistik: Übungsblatt abschließen', description: 'Varianz und Standardabweichung an zwei Beispielen üben.', effortHours: 2 }));
  const project = await fixture.service.create('alice', validTask({ title: 'StudyPrio gemeinsam testen', description: 'Aufgaben anlegen, bearbeiten und die Schnittstellen im Team prüfen.', groupId: 'study-group', importance: 5, effortHours: 3 }));
  await fixture.service.update('alice', project.id, { status: 'in_progress' });
  const done = await fixture.service.create('alice', validTask({ title: 'Datenmodell durchgehen', description: 'Felder und Fremdschlüssel im Code nachvollziehen.', effortHours: 0.5 }));
  await fixture.service.update('alice', done.id, { status: 'done' });
  const server = await createServer({ ...configuration, server: { host: '127.0.0.1', port: 5174, strictPort: true,
    fs: { allow: [frontend] }, proxy: { '/api': fixture.origin } } });
  await server.listen();
  console.log('TASK_PREVIEW_URL=http://127.0.0.1:5174');
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await server.close(); await fixture.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
