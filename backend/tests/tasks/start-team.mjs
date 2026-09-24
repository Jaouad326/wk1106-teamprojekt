// Bereitet ausschließlich temporäre, lokale Checkouts der geprüften Teamstände vor.
// Keine Änderungen an Arbeitsdateien, keine Commits oder Remote-Schreiboperationen.
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, symlink, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), 'studyprio-team-checkouts-'));
const targets = [
  ['auth', 'b8367b3284c510fa1d876fa5ea5ae9b16692f750'],
  ['groups', '78c78b367fd08e1e68dcaf4eabfa424366ff5738']
];
const created = [];
let child;
try {
  await access(path.join(root, 'backend/node_modules'));
  await access(path.join(root, 'frontend/node_modules'));
  for (const [name, sha] of targets) {
    try { await exec('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root }); }
    catch { throw new Error('Team-Commits fehlen lokal. Bitte zuerst im Projekt „git fetch origin“ ausführen.'); }
    const directory = path.join(temporary, name);
    await exec('git', ['worktree', 'add', '--detach', directory, sha], { cwd: root });
    created.push(directory);
    await symlink(path.join(root, 'backend/node_modules'), path.join(directory, 'backend/node_modules'), 'junction');
  }
  const mode = process.argv[2] || '--preview';
  const commands = {
    '--preview': [fileURLToPath(new URL('./teamPreview.mjs', import.meta.url))],
    '--test': ['--test', fileURLToPath(new URL('./team.integration.mjs', import.meta.url))],
    '--build': [fileURLToPath(new URL('./teamPreview.mjs', import.meta.url)), '--build'],
    '--browser': [fileURLToPath(new URL('./team-browser.integration.mjs', import.meta.url))]
  };
  if (!commands[mode]) throw new Error('Erlaubt: --preview, --test, --build, --browser');
  child = spawn(process.execPath, commands[mode], { stdio: 'inherit', cwd: path.join(root, 'backend'), env: {
    ...process.env, TASK_AUTH_ROOT: path.join(temporary, 'auth'), TASK_GROUPS_ROOT: path.join(temporary, 'groups')
  } });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child?.kill(signal));
  process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 0)); });
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  for (const directory of created.reverse()) {
    await exec('git', ['worktree', 'remove', '--force', directory], { cwd: root });
  }
  await rm(temporary, { recursive: true, force: true });
}
