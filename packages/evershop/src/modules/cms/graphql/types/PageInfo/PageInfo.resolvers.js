const {
  translate
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const { get } = require('@evershop/evershop/src/lib/util/get');
const { select } = require('@evershop/postgres-query-builder');

module.exports = {
  Query: {
    pageInfo: (root, args, context) => ({
      url: get(context, 'currentUrl'),
      title: get(context, 'pageInfo.title', ''),
      description: get(context, 'pageInfo.description', ''),
      keywords: get(context, 'pageInfo.keywords', '')
    })
  },
  PageInfo: {
    breadcrumbs: async (root, args, context) => {
      // Check if the current page is home page
      if (context.originalUrl === '/') {
        return [];
      }
      // Get the current path
      const path = context.originalUrl
        .split('?')[0]
        .replace(/^\/|\/$/g, '')
        .replace(/\./g, '');

      // Check if the path is existed in the url_rewrite table
      const rewriteRule = await select()
        .from('url_rewrite')
        .where('request_path', '=', `/${path}`)
        .load(context.pool);
      if (!rewriteRule) {
        return [
          {
            title: translate('Home'),
            url: '/'
          },
          {
            title: get(context, 'pageInfo.title', ''),
            url: get(context, 'currentUrl')
          }
        ];
      } else {
        // Split the target path and remove the last element
        const paths = rewriteRule.request_path.split('/');
        paths.pop();
        // Each element is represented for a category (url_key)
        // Build the breadrumbs
        const breadcrumbs = [
          {
            title: translate('Home'),
            url: '/'
          }
        ];
        for (let i = 0; i < paths.length; i += 1) {
          if (paths[i] === '') {
            continue;
          }
          const urlKey = paths[i];
          const categoryQuery = select().from('category');
          categoryQuery
            .leftJoin('category_description')
            .on(
              'category_description.category_description_category_id',
              '=',
              'category.category_id'
            );
          categoryQuery.where('category_description.url_key', '=', urlKey);
          const category = await categoryQuery.load(context.pool);
          if (category) {
            breadcrumbs.push({
              title: category.name,
              url: `${paths.slice(0, i + 1).join('/')}`
            });
          } else {
            continue;
          }
        }

        breadcrumbs.push({
          title: get(context, 'pageInfo.title', ''),
          url: get(context, 'currentUrl')
        });

        return breadcrumbs;
      }
    }
  }
};
