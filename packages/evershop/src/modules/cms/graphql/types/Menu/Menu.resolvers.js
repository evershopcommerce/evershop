import { select, value } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';

export default {
  Query: {
    menu: async (root, _, { pool }) => {
      const query = select('name')
        .select('uuid')
        .select('request_path')
        .select('url_key')
        .from('category', 'cat');
      query
        .leftJoin('category_description', 'des')
        .on('cat.category_id', '=', 'des.category_description_category_id');
      query
        .leftJoin('url_rewrite', 'url')
        .on('url.entity_uuid', '=', 'cat.uuid')
        .and('url.entity_type', '=', value('category'));
      query
        .where('cat.status', '=', 1)
        .and('cat.include_in_nav', '=', 1)
        .and('des.url_key', 'IS NOT NULL', null)
        .and('des.url_key', '!=', '');

      const items = (await query.execute(pool)).map((i) => ({
        name: i.name,
        url: i.request_path || buildUrl('categoryView', { uuid: i.uuid })
      }));

      return { items };
    }
  }
};
