import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The page of one import (§ 8.1). It only checks that the job exists; the page
 * reads the job itself from the API, and keeps reading while the job is at work.
 */
export default async (request, response: EvershopResponse, next) => {
  try {
    const { id } = request.params;
    // An id that is not a UUID is not a job: the database would refuse it with an error.
    const job = UUID.test(id)
      ? await select().from('import_job').where('uuid', '=', id).load(pool)
      : null;
    if (job === null) {
      response.status(404);
      next();
      return;
    }
    setContextValue(request, 'importJobUuid', job.uuid);
    setPageMetaInfo(request, {
      title: `Import ${job.file_name}`,
      description: `Import ${job.file_name}`
    });
    next();
  } catch (e) {
    next(e);
  }
};
