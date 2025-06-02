import { resolve } from 'path';
import chokidar from 'chokidar';
import touch from 'touch';
import { CONSTANTS } from '../../../src/lib/helpers.js';

export function watchComponents() {
  chokidar
    .watch(
      ['./packages/**/*.jsx', './extensions/**/*.jsx', './themes/**/*.jsx'],
      {
        ignored: /node_modules[\\/]/,
        ignoreInitial: true,
        persistent: true
      }
    )
    .on('add', () => {
      touch(
        resolve(
          CONSTANTS.MODULESPATH,
          '../components/common/react/client/Index.jsx'
        )
      );
    });
}
