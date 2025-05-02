import chokidar from 'chokidar';
import touch from 'touch';
import { resolve } from 'path';
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
          CONSTANTS.MOLDULESPATH,
          '../components/common/react/client/Index.jsx'
        )
      );
    });
}
