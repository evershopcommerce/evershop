import { select } from '@evershop/postgres-query-builder';
import { warning } from '../../../../../lib/log/logger.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default async (request, response) => {
  setPageMetaInfo(request, {
    title: 'Create a new product',
    description: 'Create a new product'
  });

  // Duplication entry (`?duplicate=<source uuid>`): `productId` is what every
  // shared productEdit+productNew component loads its data by, so setting it
  // prefills the whole form from the source. `duplicateSourceId` marks WHY, so
  // components can adapt (suffixed sku/url_key/name defaults, heading, the
  // banner with its hidden `duplicate_of` field). The form still POSTs to
  // createProduct — this stays a genuine creation.
  // See wiki/product-duplication-design.md.
  const sourceUuid = request.query.duplicate;
  if (!sourceUuid || typeof sourceUuid !== 'string') {
    return;
  }
  try {
    const source = await select()
      .from('product')
      .where('uuid', '=', sourceUuid)
      .load(pool);
    if (source) {
      setContextValue(request, 'productId', source.product_id);
      setContextValue(request, 'duplicateSourceId', source.product_id);
    } else {
      warning(
        `Duplicate source product "${sourceUuid}" not found — opening a blank create form.`
      );
    }
  } catch (e) {
    // Malformed uuid → postgres cast error. Open a blank create form instead.
    warning(`Ignoring invalid duplicate source "${sourceUuid}": ${e.message}`);
  }
};
