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
    let cliOptions;
    const configFile = path.resolve(CONSTANTS.LIBPATH, '../../.swcrc');
    if (fs.statSync(srcPath).isDirectory()) {
      cliOptions = [
        srcPath as string,
        '-d',
        distPath as string,
        '--config-file',
        configFile,
        '--strip-leading-paths',
        '--copy-files'
      ];
    } else {
      cliOptions = [
        srcPath as string,
        '-o',
        distPath as string,
        '--config-file',
        configFile,
        '--strip-leading-paths'
      ];
    }

    try {
      // Delete the dist directory if it exists using rimraf
      await fsp.rm(distPath as string, { recursive: true, force: true });
      await execa('swc', cliOptions, {
        cwd: path.resolve(srcPath as string, '..')
      });
    } catch (err) {
      error(`Error compiling ${srcPath}:`);
      throw err;
    }
  }
}
