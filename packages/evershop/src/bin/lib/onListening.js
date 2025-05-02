import boxen from 'boxen';
import kleur from 'kleur';
import { normalizePort } from './normalizePort.js';

const port = normalizePort();
/**
 * Event listener for HTTP server "listening" event.
 */
export function onListening() {
  const message = boxen(
    `Your website is running at "http://localhost:${port}"`,
    {
      title: 'EverShop',
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderColor: 'green'
    }
  );
  // eslint-disable-next-line no-console
  console.log(kleur.green(message));
}
