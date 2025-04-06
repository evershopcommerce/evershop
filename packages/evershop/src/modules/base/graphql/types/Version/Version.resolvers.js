import { error } from '@evershop/evershop/src/lib/log/logger.js';
import json from '@evershop/evershop/package.json' with { type: 'json' };

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
