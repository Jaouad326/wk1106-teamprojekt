// Prüft den echten App-Aufbau mit getrennten Checkouts von Amin und Haizam.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { createApp } from '../../src/app.js';
import { up as authMigration } from '../../src/modules/auth/authMigration.js';
import { up as commentMigration } from '../../src/modules/comments/commentMigration.js';

export async function teamFixture({ onMail = () => {} } = {}) {
  const tasksRoot = process.env.TEAM_TASKS_ROOT;
  const groupsRoot = process.env.TEAM_GROUPS_ROOT;
  if (!tasksRoot || !groupsRoot) throw new Error('Bitte npm run test:team oder npm run demo:team im Root ausführen.');
  const load = (root, file) => import(pathToFileURL(path.join(root, 'backend/src', file)));
  const [tasks, taskMigration, groups, groupRoutes, groupMigration, access] = await Promise.all([
    load(tasksRoot, 'modules/tasks/taskModule.js'), load(tasksRoot, 'modules/tasks/taskMigration.js'),
    load(groupsRoot, 'modules/groups/groupService.js'), load(groupsRoot, 'modules/groups/groupRoutes.js'),
    load(groupsRoot, 'modules/groups/groupMigration.js'), load(groupsRoot, 'access/accessService.js')
  ]);
  const directory = await mkdtemp(path.join(tmpdir(), 'studyprio-auth-team-'));
  const openDb = async () => {
    const db = await open({ filename: path.join(directory, 'team.sqlite'), driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    return db;
  };
  const db = await openDb();
  try {
    await authMigration(db); await groupMigration.up(db); await taskMigration.up(db); await commentMigration(db);
    if ((await db.all('PRAGMA foreign_key_check')).length) throw new Error('Fremdschlüsselfehler im Prüfaufbau.');
  } finally { await db.close(); }
  const accessDb = await openDb();
  const messages = [];
  const appOrigin = 'http://localhost:5175';
  const config = { appOrigin, allowedDomains: ['campus.example'], mailMode: 'local', secure: false };
  const runtime = createApp({ openDb, config, mailer: { async sendLoginLink(message) {
    messages.push(message); onMail(message);
  } }, mountFeatures(app, { requireAuth, userDirectory }) {
    // Gruppen verwenden Transaktionen. Je Aufruf ein eigener Handle verhindert
    // verschachtelte Transaktionen bei gleichzeitigen HTTP-Anfragen.
    const groupService = Object.fromEntries(['createGroup', 'addMember', 'removeMember', 'listGroups', 'getGroup', 'listMembers'].map(method => [method, async (...args) => {
      const connection = await openDb();
      try { return await groups.createGroupService(connection, userDirectory)[method](...args); }
      finally { await connection.close(); }
    }]));
    const accessService = access.createAccessService(accessDb);
    const taskModule = tasks.createTaskModule({ openDb, requireAuth, accessService });
    app.use('/api/groups', groupRoutes.createGroupRouter(groupService, requireAuth));
    app.use('/api/tasks', taskModule.taskRouter);
    return { taskService: taskModule.taskService, groupService };
  } });
  await runtime.repository.ensureMailMode('local');
  const server = runtime.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function request(method, route, body, cookie) {
    const response = await fetch(`${origin}/api${route}`, { method, headers: {
      Origin: appOrigin, 'Content-Type': 'application/json', 'X-StudyPrio-Request': '1', ...(cookie ? { Cookie: cookie } : {})
    }, ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }) });
    return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0],
      ...(response.status === 204 ? {} : await response.json()) };
  }
  async function login(email) {
    const result = await request('POST', '/auth/request-link', { email });
    if (result.status !== 202) throw new Error('Test-Anmeldung fehlgeschlagen.');
    const token = new URLSearchParams(new URL(messages.at(-1).url).hash.slice(1)).get('token');
    return request('POST', '/auth/verify', { token });
  }
  return { ...runtime, origin, request, login, openDb, async close() {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await accessDb.close(); await rm(directory, { recursive: true, force: true });
  } };
}
