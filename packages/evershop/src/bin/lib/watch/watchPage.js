import { resolve } from 'path';
import touch from 'touch';
import { CONSTANTS } from '../../../src/lib/helpers.js';

export function watchPage(event) {
  if (event === 'add') {
    // TODO: Touching this file will trigger a rebuild of all pages. This is not optimized
    touch(
      resolve(
        CONSTANTS.MODULESPATH,
        '../components/common/react/client/Index.jsx'
      )
    );
  }
}
