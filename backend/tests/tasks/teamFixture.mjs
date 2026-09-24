// Nur Integrationstest: echte Auth-/Gruppenmodule, echte DB, Test-Mailtransport.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { createTaskModule } from '../../src/modules/tasks/taskModule.js';
import { up as migrateTasks } from '../../src/modules/tasks/taskMigration.js';
import { up as migrateComments } from '../../src/modules/comments/commentMigration.js';

export async function createTeamFixture({ appOrigin = 'http://localhost:5175', onMail = () => {} } = {}) {
  if (!process.env.TASK_AUTH_ROOT || !process.env.TASK_GROUPS_ROOT) throw new Error('TASK_AUTH_ROOT und TASK_GROUPS_ROOT müssen auf die echten Team-Checkouts zeigen.');
  const load = (root, file) => import(pathToFileURL(path.resolve(root, 'backend/src', file)));
  const auth = file => load(process.env.TASK_AUTH_ROOT, `modules/auth/${file}`);
  const groups = file => load(process.env.TASK_GROUPS_ROOT, file);
  const [authMigration, authRepository, authService, sessionService, authRoutes, authError,
    groupMigration, groupService, groupRoutes, access] = await Promise.all([
    auth('authMigration.js'), auth('authRepository.js'), auth('authService.js'), auth('sessionService.js'), auth('authRoutes.js'), auth('authError.js'),
    groups('modules/groups/groupMigration.js'), groups('modules/groups/groupService.js'), groups('modules/groups/groupRoutes.js'), groups('access/accessService.js')
  ]);
  const directory = await mkdtemp(path.join(tmpdir(), 'studyprio-team-'));
  const openDb = async () => {
    const db = await open({ filename: path.join(directory, 'team.sqlite'), driver: sqlite3.Database });
    await db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    return db;
  };
  const db = await openDb();
  const migrate = async connection => {
    await authMigration.up(connection);
    await groupMigration.up(connection);
    await migrateTasks(connection);
    await migrateComments(connection);
  };
  await migrate(db); await db.close();
  // Eigene Leseverbindung: keine unbestätigten Daten aus Gruppen-Schreibtransaktionen lesen.
  const groupDb = await openDb(), accessDb = await openDb();
  const messages = [];
  const repository = authRepository.createAuthRepository({ openDb });
  const authentication = authService.createAuthService({ repository, appOrigin, allowedDomains: ['campus.example'],
    mailer: { async sendLoginLink(message) { messages.push(message); onMail(message); } } });
  const sessions = sessionService.createSessionService({ repository, secure: false });
  const requireAuth = authRoutes.createRequireAuth(sessions);
  const realGroups = groupService.createGroupService(groupDb, { findVerifiedByEmail: authentication.findVerifiedByEmail });
  const accessService = access.createAccessService(accessDb);
  const { taskService, taskRouter } = createTaskModule({ openDb, requireAuth, accessService });
  const app = express();
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', authRoutes.protectWrites(appOrigin));
  app.use(express.json({ limit: '8kb' }));
  app.use('/api/auth', authRoutes.createAuthRouter({ service: authentication, repository, sessions, localMail: true }));
  app.use('/api/groups', groupRoutes.createGroupRouter(realGroups, requireAuth));
  app.use('/api/tasks', taskRouter);
  // Ahshans Kommentarrouter passt noch nicht zum asynchronen Rechtevertrag.
  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Nicht gefunden.' } }));
  app.use((error, req, res, next) => {
    if (error instanceof authError.AuthError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Ungültiges JSON.' } });
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Fehler.' } });
  });
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function request(method, route, body, cookie, headers = {}) {
    const response = await fetch(`${origin}/api${route}`, { method, headers: {
      origin: appOrigin, 'Content-Type': 'application/json', 'X-StudyPrio-Request': '1', ...(cookie ? { cookie } : {}), ...headers
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], ...(response.status === 204 ? {} : await response.json()) };
  }
  async function login(email) {
    const requested = await request('POST', '/auth/request-link', { email });
    if (requested.status !== 202) throw new Error(`Anmeldelink fehlgeschlagen: ${requested.status}`);
    const token = new URLSearchParams(new URL(messages.at(-1).url).hash.slice(1)).get('token');
    const verified = await request('POST', '/auth/verify', { token });
    if (verified.status !== 200) throw new Error(`Anmeldung fehlgeschlagen: ${verified.status}`);
    return { user: verified.data, cookie: verified.cookie };
  }
  return { origin, request, login, messages, openDb, migrate, accessService, taskService, groupService: realGroups,
    async close() {
      await new Promise(resolve => server.close(resolve));
      await groupDb.close(); await accessDb.close(); await rm(directory, { recursive: true, force: true });
    }
  };
}
