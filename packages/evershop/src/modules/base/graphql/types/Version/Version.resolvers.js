import json from '@evershop/evershop/package.json' with { type: 'json' };
import { error } from '../../../../../lib/log/logger.js';

export default {
  Query: {
    version: () => {
      try {
        return json.version;
      } catch (e) {
        error(e);
        return 'unknown';
      }
    }
  }
};
