import path from 'path';
import { compileSwc } from '../lib/watch/compileSwc.js';
import { getSrcPaths } from '../lib/watch/getSrcPaths.js';

async function compileTs() {
  const srcPaths = getSrcPaths();
  const events = srcPaths.map((srcPath) => {
    return {
      srcPath: srcPath,
      distPath: path.resolve(srcPath, '..', 'dist')
    };
  });
  await Promise.all(
    events.map((event) => {
      return compileSwc(event.srcPath, event.distPath);
    })
  );
}

export { compileTs };
