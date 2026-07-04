import {
  commit,
  insert,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { getValue, getValueSync } from '../../../../lib/util/registry.js';
import { assertUrlKeyAvailable } from '../../../base/services/assertUrlKeyAvailable.js';
import { getAjv } from '../../../base/services/getAjv.js';
import landingPageDataSchema from './landingPageDataSchema.json' with { type: 'json' };
import { normalizeLandingPageData } from './normalizeLandingPageData.js';
import { syncLandingPageUrlRewrite } from './syncLandingPageUrlRewrite.js';

export interface LandingPageData {
  name: string;
  url_key: string;
  status?: boolean | number | string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  publish_start?: string | null;
  publish_end?: string | null;
}

function validateLandingPageDataBeforeInsert(data: any): any {
  const ajv = getAjv();
  (landingPageDataSchema as any).required = ['name', 'url_key'];
  const jsonSchema = getValueSync(
    'createLandingPageDataJsonSchema',
    landingPageDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  if (validate(data)) {
    return data;
  }
  throw new Error(validate.errors[0].message);
}

async function insertLandingPageData(data: any, connection: any): Promise<any> {
  return insert('landing_page').given(data).execute(connection);
}

const _createLandingPage = async function createLandingPage(
  data: any,
  context: any
): Promise<any> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const lpData = normalizeLandingPageData(
      await getValue('landingPageDataBeforeCreate', data)
    );
    validateLandingPageDataBeforeInsert(lpData);
    await assertUrlKeyAvailable(
      connection,
      lpData.url_key,
      null,
      'landing_page'
    );
    const landingPage = await hookable(insertLandingPageData, {
      ...context,
      connection
    })(lpData, connection);
    await syncLandingPageUrlRewrite(connection, {
      uuid: landingPage.uuid,
      url_key: lpData.url_key
    });
    await commit(connection);
    return landingPage;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function createLandingPage(data: any, context: any): Promise<any> {
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(_createLandingPage, context)(data, context);
}

export default createLandingPage;

export function hookBeforeInsertLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('insertLandingPageData', callback, priority);
}
export function hookAfterInsertLandingPageData(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('insertLandingPageData', callback, priority);
}
export function hookBeforeCreateLandingPage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('createLandingPage', callback, priority);
}
export function hookAfterCreateLandingPage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('createLandingPage', callback, priority);
}
