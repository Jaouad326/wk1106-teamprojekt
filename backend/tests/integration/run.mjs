import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const temp = await mkdtemp(path.join(tmpdir(), 'studyprio-meeting-'));
const checkouts = [];
const targets = [ ['tasks', 'a552cdb'], ['groups', '78c78b3'] ];
let child;
try {
  for (const [name, commit] of targets) {
    const target = path.join(temp, name);
    await exec('git', ['worktree', 'add', '--detach', target, commit], { cwd: root });
    checkouts.push(target);
    for (const area of ['backend', 'frontend']) {
      await symlink(path.join(root, area, 'node_modules'), path.join(target, area, 'node_modules'), 'junction');
    }
  }
  const mode = process.argv[2] || '--preview';
  const scripts = { '--test': ['--test', 'team.test.mjs'], '--preview': ['preview.mjs'], '--browser': ['browser.mjs'] };
  if (!scripts[mode]) throw new Error('Erlaubt: --test, --preview, --browser');
  child = spawn(process.execPath, scripts[mode], { cwd: fileURLToPath(new URL('.', import.meta.url)), stdio: 'inherit', env: {
    ...process.env, TEAM_TASKS_ROOT: path.join(temp, 'tasks'), TEAM_GROUPS_ROOT: path.join(temp, 'groups')
  } });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
  process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 0)); });
} catch (error) {
  console.error('Teamprüfung fehlgeschlagen. Zuerst git fetch origin und npm ci in Root/Backend/Frontend ausführen.');
  console.error(error.message); process.exitCode = 1;
} finally {
  for (const target of checkouts.reverse()) await exec('git', ['worktree', 'remove', '--force', target], { cwd: root });
  await rm(temp, { recursive: true, force: true });
}
