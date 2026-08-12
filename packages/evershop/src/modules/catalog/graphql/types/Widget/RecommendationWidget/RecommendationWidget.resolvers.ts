/**
 * Pure echo (specifications/05 § 9.3): the widget's stored settings arrive as
 * field arguments via the `variables` export's getWidgetSetting placeholders,
 * and travel back through the query result to the component — the exact
 * CollectionProductsWidget mechanism.
 */
export default {
  Query: {
    recommendationWidget: (
      _root: unknown,
      { heading, limit }: { heading?: string; limit?: number }
    ) => ({
      heading: heading ?? null,
      limit: typeof limit === 'number' ? limit : null
    })
  }
};
