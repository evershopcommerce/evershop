import { normalize, resolve } from 'path';
import { CONSTANTS } from '../../../src/lib/helpers.js';
import { info } from '../../../src/lib/log/logger.js';
import { broadcash } from './broadcash.js';

export function watchSchema(event, path) {
  // Check if path include graphql/types
  if (!path.includes(normalize('graphql/types'))) {
    return;
  }
  if (event === 'change') {
    info(`Updating ${path}`);
    delete require.cache[require.resolve(path)];
  }
  info('Cleaning require cache');
  // Delete buildSchema.js cache
  delete require.cache[
    require.resolve(
      resolve(CONSTANTS.MOLDULESPATH, 'graphql/services/buildSchema')
    )
  ];
  require(resolve(CONSTANTS.MOLDULESPATH, 'graphql/services/buildSchema'));
  broadcash();
}
