import { resolveLink } from '../../../../../../lib/widget/linkResolver.js';

export default {
  Query: {
    collectionProductsWidget: async (
      root,
      {
        collection,
        count,
        countPerRow,
        heading,
        subText,
        viewAllLink,
        viewAllLabel
      },
      { linkLoaders }
    ) => ({
      collection,
      count: count ? parseInt(count, 10) : 5,
      countPerRow: countPerRow ? parseInt(countPerRow, 10) : 4,
      // Pass overrides through verbatim. The storefront component falls
      // back to `collection.name` / `collection.description` when these
      // are null or empty strings.
      heading: typeof heading === 'string' ? heading : null,
      subText: typeof subText === 'string' ? subText : null,
      // URN passthrough goes through the request-scoped link loaders so
      // a stored `urn:evershop:catalog:category:<uuid>` resolves to the
      // category's current url_rewrite; plain URLs pass through unchanged.
      viewAllLink: viewAllLink
        ? await resolveLink(viewAllLink, linkLoaders)
        : null,
      viewAllLabel:
        typeof viewAllLabel === 'string' && viewAllLabel.length > 0
          ? viewAllLabel
          : null
    })
  }
};
