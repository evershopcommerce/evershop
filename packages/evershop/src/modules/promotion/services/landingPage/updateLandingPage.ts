import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import { PromotionUrn } from '../../../../lib/urn/index.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { getValue, getValueSync } from '../../../../lib/util/registry.js';
import { assertUrlKeyAvailable } from '../../../base/services/assertUrlKeyAvailable.js';
import { getAjv } from '../../../base/services/getAjv.js';
import { recordRedirect } from '../../../base/services/recordRedirect.js';
import landingPageDataSchema from './landingPageDataSchema.json' with { type: 'json' };
import { normalizeLandingPageData } from './normalizeLandingPageData.js';
import { syncLandingPageUrlRewrite } from './syncLandingPageUrlRewrite.js';

function validateLandingPageDataBeforeUpdate(data: any): any {
  const ajv = getAjv();
  (landingPageDataSchema as any).required = [];
  const jsonSchema = getValueSync(
    'updateLandingPageDataJsonSchema',
    landingPageDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  if (validate(data)) {
    return data;
  }
  throw new Error(validate.errors[0].message);
}

async function updateLandingPageData(
  uuid: string,
  data: any,
  connection: any
): Promise<any> {
  const landingPage = await select()
    .from('landing_page')
    .where('uuid', '=', uuid)
    .load(connection);
  if (!landingPage) {
    throw new Error('Requested landing page not found');
  }
  const oldUrlKey = landingPage.url_key;
  // On a url_key change, reject a slug unreachable or owned by another landing page.
  if (data.url_key && data.url_key !== oldUrlKey) {
    await assertUrlKeyAvailable(
      connection,
      data.url_key,
      landingPage.uuid,
      'landing_page'
    );
  }

  let newLandingPage = landingPage;
  try {
    newLandingPage = await update('landing_page')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection);
    Object.assign(landingPage, newLandingPage);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }

  // Keep the root-level friendly URL in sync with the (possibly new) url_key.
  await syncLandingPageUrlRewrite(connection, {
    uuid: landingPage.uuid,
    url_key: data.url_key ?? oldUrlKey
  });

  // On a rename, keep the old URL alive: 302 /<oldKey> -> /<newKey>.
  if (data.url_key && data.url_key !== oldUrlKey) {
    await recordRedirect(connection, {
      fromPath: `/${oldUrlKey}`,
      toPath: `/${data.url_key}`,
      entityUrn: PromotionUrn.landingPage(landingPage.uuid)
    });
  }

  return landingPage;
}

async function updateLandingPage(
  uuid: string,
  data: any,
  context: any
): Promise<any> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const lpData = normalizeLandingPageData(
      await getValue('landingPageDataBeforeUpdate', data)
    );
    validateLandingPageDataBeforeUpdate(lpData);
    const landingPage = await hookable(updateLandingPageData, {
      ...context,
      connection
    })(uuid, lpData, connection);
    await commit(connection);
    return landingPage;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

export default async (
  uuid: string,
  data: any,
  context: any
): Promise<any> => {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(updateLandingPage, context)(uuid, data, context);
};

export function hookBeforeUpdateLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('updateLandingPageData', callback, priority);
}
export function hookAfterUpdateLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('updateLandingPageData', callback, priority);
}
export function hookBeforeUpdateLandingPage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('updateLandingPage', callback, priority);
}
export function hookAfterUpdateLandingPage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('updateLandingPage', callback, priority);
}
