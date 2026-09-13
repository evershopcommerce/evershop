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
import { cloneWidgetBody } from './cloneWidgetBody.js';
import { findFreeUrlKey } from './findFreeUrlKey.js';
import { syncLandingPageUrlRewrite } from './syncLandingPageUrlRewrite.js';

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

  // 1. Clone the entity row as an unpublished draft with a fresh url_key
  //    (`<base>-copy`, then `-copy-2`, …; landing_page.url_key is UNIQUE).
  const newUrlKey = await findFreeUrlKey(
    async (candidate) =>
      !!(await select()
        .from('landing_page')
        .where('url_key', '=', candidate)
        .load(connection)),
    source.url_key,
    'copy'
  );
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

  // 2. Deep-clone the page-builder body (instances AND placements, fresh
  //    uuids, container-child areas re-pointed at the copied parent). Every
  //    theme bucket is preserved as-is, so a page built under two themes keeps
  //    both bodies. See wiki/landing-pages.md § Duplicate.
  await cloneWidgetBody(connection, {
    from: { route: null, entityUrn: PromotionUrn.landingPage(uuid) },
    to: { route: null, entityUrn: PromotionUrn.landingPage(copy.uuid) },
    theme: 'preserve'
  });

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
