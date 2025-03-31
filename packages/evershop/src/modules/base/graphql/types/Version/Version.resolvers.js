/* eslint-disable no-underscore-dangle */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { error } from '@evershop/evershop/src/lib/log/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  Query: {
    version: () => {
      try {
        // Get the path to the @evershop/evershop package.json
        const packagePath = join(__dirname, '../../../package.json');
        return JSON.parse(readFileSync(packagePath, 'utf8')).version;
      } catch (e) {
        error(e);
        return 'unknown';
      }
    }
  }
};
