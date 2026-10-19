import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { maxFileBytes } from '../../../adapters/importConfig.js';
import { ImportJobCollection } from '../../../adapters/ImportJobCollection.js';
import { ACTIVE_STATUSES } from '../../../services/job/types.js';

export default {
  Query: {
    importLimits: (
      _root: unknown,
      _args: unknown,
      { user }: { user?: unknown }
    ) =>
      // This field is for the admin only.
      user ? { maxFileBytes: maxFileBytes() } : null,
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
