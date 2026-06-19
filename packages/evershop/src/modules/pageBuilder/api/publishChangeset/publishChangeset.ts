import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { publishChangeset } from '../../services/publishChangeset.js';

/**
 * POST /api/page-builder/changesets/:id/publish
 *
 * Walks the changeset's operations transactionally, applying each to source
 * tables. Sets `published_at` on success. After publishing, the changeset is
 * preserved in the DB for audit but is immutable (subsequent operation adds
 * are rejected by `addChangesetOperation`).
 */
// 3-arg signature: avoid auto-next behavior of 2-arg handlers (causes
// ERR_HTTP_HEADERS_SENT via apiResponse).
export default async (
  request: EvershopRequest,
  response: EvershopResponse,
   
  _next: (err?: unknown) => void
) => {
  const changesetId = Number(request.params.id);
  if (!Number.isInteger(changesetId) || changesetId <= 0) {
    return response.status(BAD_REQUEST).json({
      error: { status: BAD_REQUEST, message: 'Invalid changeset id' }
    });
  }

  // Existence check before opening the publish transaction.
  const existing = await select()
    .from('changeset')
    .where('changeset_id', '=', changesetId)
    .load(pool);
  if (!existing) {
    return response.status(NOT_FOUND).json({
      error: {
        status: NOT_FOUND,
        message: `Changeset ${changesetId} not found`
      }
    });
  }
  if ((existing as any).published_at) {
    return response.status(BAD_REQUEST).json({
      error: {
        status: BAD_REQUEST,
        message: 'Changeset is already published'
      }
    });
  }

  try {
    await publishChangeset(changesetId);
    const updated = await select()
      .from('changeset')
      .where('changeset_id', '=', changesetId)
      .load(pool);
    return response.status(OK).json({ data: updated });
  } catch (e) {
    return response.status(INTERNAL_SERVER_ERROR).json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: e instanceof Error ? e.message : 'Publish failed'
      }
    });
  }
};
