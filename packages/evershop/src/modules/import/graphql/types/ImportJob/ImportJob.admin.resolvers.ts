import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { ImportJobCollection } from '../../../adapters/ImportJobCollection.js';
import { ACTIVE_STATUSES } from '../../../services/job/types.js';

export default {
  Query: {
    importJobs: async (
      _root: unknown,
      { filters = [] }: { filters?: Array<Record<string, unknown>> },
      { user }: { user?: unknown }
    ) => {
      // This field is for the admin only.
      if (!user) {
        return null;
      }
      const collection = new ImportJobCollection(select().from('import_job'));
      await collection.init(filters as never);
      return collection;
    }
  },
  ImportJob: {
    active: ({ status }: { status: string }) =>
      (ACTIVE_STATUSES as readonly string[]).includes(status),
    deleteApi: ({ uuid }: { uuid: string }) =>
      buildUrl('deleteImportJob', { id: uuid })
  }
};
