import path from 'path';
import { fileURLToPath } from 'url';
import spawn from 'cross-spawn';
import { debug, error } from '../../lib/log/logger.js';

function startDev() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const args = [path.resolve(__dirname, 'init.js')];
  const appProcess = spawn('node', args, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env: {
      ...process.env,
      ALLOW_CONFIG_MUTATIONS: true
    }
  });

  appProcess.on('error', (err) => {
    error(`Error spawning processor: ${err}`);
  });

  appProcess.on('message', (message) => {
    debug('Restarting the development server');
    if (message === 'RESTART_ME') {
      if (appProcess && appProcess.pid) {
        appProcess.removeAllListeners();
        appProcess.kill('SIGTERM');
      }
      startDev();
    }
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
