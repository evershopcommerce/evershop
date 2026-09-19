import {
  commit,
  del,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { PromotionUrn } from '../../../../lib/urn/index.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { clearRedirectsForEntity } from '../../../base/services/recordRedirect.js';
import { deleteLandingPageUrlRewrite } from './syncLandingPageUrlRewrite.js';

async function deleteLandingPageData(
  uuid: string,
  connection: any
): Promise<void> {
  const urn = PromotionUrn.landingPage(uuid);
  // Purge historical redirect aliases (by entity_urn) so old URLs stop 302ing.
  await clearRedirectsForEntity(connection, urn);
  // Remove the root-level friendly URL so /<url_key> stops resolving.
  await deleteLandingPageUrlRewrite(connection, uuid);
  // The landing page's body is entity-scoped widget placements. widget_placement
  // has NO FK to landing_page (entity_urn is a plain varchar), so dropping the
  // row won't cascade — delete the body explicitly by URN, then delete the
  // instances that were ONLY placed on this page (an instance still placed on
  // another route or page survives). The candidate set is this page's own
  // instances — never a global sweep, because placement-less instances are a
  // designed state elsewhere. Raw SQL; cms widget hooks do not fire.
  const owned = await connection.query(
    'SELECT DISTINCT widget_instance_id FROM widget_placement WHERE entity_urn = $1',
    [urn]
  );
  const ownedIds: number[] = owned.rows.map(
    (r: { widget_instance_id: number }) => r.widget_instance_id
  );
  await del('widget_placement')
    .where('entity_urn', '=', urn)
    .execute(connection);
  if (ownedIds.length > 0) {
    await connection.query(
      `DELETE FROM widget_instance wi
        WHERE wi.widget_instance_id = ANY($1::int[])
          AND NOT EXISTS (SELECT 1 FROM widget_placement p
                           WHERE p.widget_instance_id = wi.widget_instance_id)`,
      [ownedIds]
    );
  }
  await del('landing_page').where('uuid', '=', uuid).execute(connection);
}

const _deleteLandingPage = async function deleteLandingPage(
  uuid: string,
  context: any
): Promise<any> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const landingPage = await select()
      .from('landing_page')
      .where('uuid', '=', uuid)
      .load(connection);
    if (!landingPage) {
      throw new Error('Invalid landing page id');
    }
    await hookable(deleteLandingPageData, {
      ...context,
      landingPage,
      connection
    })(uuid, connection);
    await commit(connection);
    return landingPage;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function deleteLandingPage(
  uuid: string,
  context: any
): Promise<any> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_deleteLandingPage, context)(uuid, context);
}

export default deleteLandingPage;

export function hookBeforeDeleteLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('deleteLandingPageData', callback, priority);
}
export function hookAfterDeleteLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('deleteLandingPageData', callback, priority);
}
export function hookBeforeDeleteLandingPage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('deleteLandingPage', callback, priority);
}
export function hookAfterDeleteLandingPage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('deleteLandingPage', callback, priority);
}
