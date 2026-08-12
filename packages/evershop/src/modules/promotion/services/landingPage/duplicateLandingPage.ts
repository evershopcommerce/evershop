import {
  commit,
  insert,
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
import { syncLandingPageUrlRewrite } from './syncLandingPageUrlRewrite.js';

/** Find a free `<base>-copy[-N]` url_key (the landing_page.url_key is UNIQUE). */
async function uniqueUrlKey(connection: any, base: string): Promise<string> {
  let candidate = `${base}-copy`;
  let n = 1;
   
  while (
    await select()
      .from('landing_page')
      .where('url_key', '=', candidate)
      .load(connection)
  ) {
    n += 1;
    candidate = `${base}-copy-${n}`;
  }
  return candidate;
}

async function duplicateLandingPageData(
  uuid: string,
  connection: any
): Promise<any> {
  const source = await select()
    .from('landing_page')
    .where('uuid', '=', uuid)
    .load(connection);
  if (!source) {
    throw new Error('Invalid landing page id');
  }

  // 1. Clone the entity row as an unpublished draft with a fresh url_key.
  const newUrlKey = await uniqueUrlKey(connection, source.url_key);
  const copy = await insert('landing_page')
    .given({
      status: false,
      name: `${source.name} (copy)`,
      url_key: newUrlKey,
      description: source.description,
      meta_title: source.meta_title,
      meta_description: source.meta_description,
      publish_start: source.publish_start,
      publish_end: source.publish_end
    })
    .execute(connection);

  await syncLandingPageUrlRewrite(connection, {
    uuid: copy.uuid,
    url_key: newUrlKey
  });

  // 2. Deep-clone the page-builder body. Settings live on widget_instance, so a
  // placement-only (shallow) copy would let editing the copy mutate the original
  // — clone the instances too and repoint the cloned placements at them + the
  // new entity_urn. See wiki/landing-pages.md § Duplicate.
  const oldUrn = PromotionUrn.landingPage(uuid);
  const newUrn = PromotionUrn.landingPage(copy.uuid);
  const placements = await select()
    .from('widget_placement')
    .where('entity_urn', '=', oldUrn)
    .execute(connection);

  const instanceIds = [
    ...new Set(placements.map((p: any) => p.widget_instance_id))
  ];
  const idMap = new Map<number, number>();
  for (const oldId of instanceIds) {
     
    const wi = await select()
      .from('widget_instance')
      .where('widget_instance_id', '=', oldId)
      .load(connection);
    if (!wi) continue;
     
    const newWi = await insert('widget_instance')
      .given({
        name: wi.name,
        type: wi.type,
        settings: wi.settings,
        status: wi.status,
        theme: wi.theme
      })
      .execute(connection);
    idMap.set(oldId as number, newWi.widget_instance_id);
  }

  for (const p of placements) {
    const newInstanceId = idMap.get(p.widget_instance_id);
    if (!newInstanceId) continue;
     
    await insert('widget_placement')
      .given({
        widget_instance_id: newInstanceId,
        route: p.route,
        area: p.area,
        sort_order: p.sort_order,
        theme: p.theme,
        entity_urn: newUrn
      })
      .execute(connection);
  }

  return copy;
}

const _duplicateLandingPage = async function duplicateLandingPage(
  uuid: string,
  context: any
): Promise<any> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const copy = await hookable(duplicateLandingPageData, {
      ...context,
      connection
    })(uuid, connection);
    await commit(connection);
    return copy;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function duplicateLandingPage(
  uuid: string,
  context: any
): Promise<any> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_duplicateLandingPage, context)(uuid, context);
}

export default duplicateLandingPage;

export function hookBeforeDuplicateLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('duplicateLandingPageData', callback, priority);
}
export function hookAfterDuplicateLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('duplicateLandingPageData', callback, priority);
}
