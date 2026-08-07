import path from 'path';
import { fileURLToPath } from 'url';
import spawn from 'cross-spawn';
import { error } from '../../lib/log/logger.js';
import isDevelopmentMode from '../../lib/util/isDevelopmentMode.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startSubscriberProcess(context) {
  const args = [path.resolve(__dirname, '../../lib/event/event-manager.js')];
  if (isDevelopmentMode() || process.argv.includes('--debug')) {
    args.push('--debug');
  }
  const child = spawn('node', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      bootstrapContext: JSON.stringify(context),
      ALLOW_CONFIG_MUTATIONS: true
    }
  });

  child.on('error', (err) => {
    error(`Error spawning event processor: ${err}`);
  });

  child.unref();
  return child;
}
