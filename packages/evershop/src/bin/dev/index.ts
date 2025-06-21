import path from 'path';
import { fileURLToPath } from 'url';
import spawn from 'cross-spawn';
import { debug, error } from '../../lib/index.js';

function startDev() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const args = [path.resolve(__dirname, 'init.js')];
  const appProcess = spawn('node', args, {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: {
      ...process.env,
      ALLOW_CONFIG_MUTATIONS: true
    }
  });

  appProcess.on('error', (err) => {
    error(`Error spawning processor: ${err}`);
  });

  return appProcess;
}

const childProcess = startDev();
process.on('exit', () => {
  // Cleanup child processes on exit
  if (childProcess && childProcess.pid) {
    childProcess.kill();
  }
});

process.on('SIGUSR2', () => {
  debug('Restarting the development server');
  if (childProcess && childProcess.pid) {
    childProcess.kill('SIGTERM');
  }
  startDev();
});
