import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] || '--preview';
const scripts = { '--test': ['--test', 'team.test.mjs'], '--preview': ['preview.mjs'], '--browser': ['browser.mjs'] };
if (!scripts[mode]) throw new Error('Erlaubt: --test, --preview, --browser');
const child = spawn(process.execPath, scripts[mode], {
  cwd: fileURLToPath(new URL('.', import.meta.url)), stdio: 'inherit', env: process.env
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
try {
  process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
} catch (error) {
  console.error('Teamprüfung konnte nicht starten:', error.message);
  process.exitCode = 1;
}
