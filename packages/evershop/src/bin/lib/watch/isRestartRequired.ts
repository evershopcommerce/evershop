import path from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { isSrc } from './isSrc.js';
import { Event } from './watchHandler.js';

export function isRestartRequired(event: Event) {
  if (isSrc(event.path)) {
    return false;
  } else if (event.path === path.resolve(CONSTANTS.ROOTPATH, '.env')) {
    // If the .env file is changed, we need to restart the server
    return true;
  } else {
    const configPath = path.resolve(CONSTANTS.ROOTPATH, 'config');
    if (
      event.path.toString().startsWith(configPath) &&
      path.extname(event.path as string) === '.json'
    ) {
      // If a config JSON file is changed, we need to restart the server
      return true;
    }
    return false;
  }
}
