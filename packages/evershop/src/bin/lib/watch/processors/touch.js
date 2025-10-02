import { resolve } from 'path';
import touch from 'touch';
import { CONSTANTS } from '../../../../lib/helpers.js';

export function justATouch(path) {
  touch(
    path ||
      resolve(
        CONSTANTS.MODULESPATH,
        '../components/common/react/client/Index.js'
      )
  );
}

export async function touchList(paths) {
  await Promise.all(paths.map((p) => touch(p)));
}
