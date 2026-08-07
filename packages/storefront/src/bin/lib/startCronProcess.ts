import path from 'path';
import { fileURLToPath } from 'url';
import spawn from 'cross-spawn';
import { error } from '../../lib/log/logger.js';
import isDevelopmentMode from '../../lib/util/isDevelopmentMode.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startCronProcess(context) {
  // Spawn the child process to manage scheduled jobs
  const jobArgs = [path.resolve(__dirname, '../../lib/cronjob/cronjob.js')];
  if (isDevelopmentMode() || process.argv.includes('--debug')) {
    jobArgs.push('--debug');
  }
  const jobChild = spawn('node', jobArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      bootstrapContext: JSON.stringify(context),
      ALLOW_CONFIG_MUTATIONS: true
    }
  });
  jobChild.on('error', (err) => {
    error(`Error spawning job processor: ${err}`);
  });
  jobChild.unref();
  return jobChild;
}
