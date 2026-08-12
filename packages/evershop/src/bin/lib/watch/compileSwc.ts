import fs, { promises as fsp } from 'fs';
import type { PathLike } from 'fs';
import path from 'path';
import { execa } from 'execa';
import { CONSTANTS } from '../../../lib/helpers.js';
import { error, warning } from '../../../lib/log/logger.js';

export async function compileSwc(
  srcPath: PathLike,
  distPath: PathLike
): Promise<void> {
  // Check if the source is a file or directory
  if (!fs.existsSync(srcPath)) {
    warning(`Source path ${srcPath} does not exist.`);
    return;
    // Check if file extension is not either ts, js, tsx, or jsx
  } else if (
    fs.statSync(srcPath).isFile() &&
    !['.ts', '.js', '.tsx', '.jsx'].includes(path.extname(srcPath as string))
  ) {
    // For this case, we just force copy the file to the dist directory
    try {
      const directory = path.dirname(distPath as string);
      await fsp.mkdir(directory, { recursive: true });
      await fsp.copyFile(srcPath as string, distPath as string);
    } catch (err) {
      error(`Error copying ${srcPath} to ${distPath}:`);
      throw err;
    }
  } else {
    const configFile = path.resolve(CONSTANTS.LIBPATH, '../../.swcrc');
    const cwd = path.resolve(srcPath as string, '..');
    // preferLocal resolves the `swc` binary from node_modules/.bin (walking up
    // from localDir), so the compile works no matter how the process was
    // launched (npm script, IDE runner, plain `node`) — a bare `swc` spawn only
    // resolves when npm happens to have put .bin on the PATH.
    const execaOptions = { cwd, preferLocal: true, localDir: cwd };

    try {
      if (fs.statSync(srcPath).isDirectory()) {
        // Compile into a temp sibling and swap it in only on success. Compiling
        // straight into distPath after an upfront delete destroys the previous
        // build whenever the compiler fails (or is missing) — including the
        // files a RUNNING app still lazy-loads from dist.
        const tmpDist = `${distPath as string}.compiling`;
        await fsp.rm(tmpDist, { recursive: true, force: true });
        await execa(
          'swc',
          [
            srcPath as string,
            '-d',
            tmpDist,
            '--config-file',
            configFile,
            '--strip-leading-paths',
            '--copy-files'
          ],
          execaOptions
        );
        await fsp.rm(distPath as string, { recursive: true, force: true });
        await fsp.rename(tmpDist, distPath as string);
      } else {
        // Single file: `swc -o` overwrites in place, no pre-delete needed.
        await execa(
          'swc',
          [
            srcPath as string,
            '-o',
            distPath as string,
            '--config-file',
            configFile,
            '--strip-leading-paths'
          ],
          execaOptions
        );
      }
    } catch (err) {
      error(`Error compiling ${srcPath}:`);
      throw err;
    }
  }
}
