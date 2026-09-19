import { listMetafieldDefinitions } from '../../../../../lib/metafield/index.js';

export default {
  Query: {
    metafieldDefinitions: async (
      _: unknown,
      { ownerType }: { ownerType: string },
      { user }: { user?: unknown }
    ) => {
      // Admin-only: definitions describe internal config and hidden fields.
      if (!user) return [];
      return listMetafieldDefinitions(ownerType);
    }
  }
};
