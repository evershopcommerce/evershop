const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  getProductsByCategoryBaseQuery
} = require('./getProductsByCategoryBaseQuery');

module.exports.getFilterableAttributes = async (categoryId) => {
  const productsQuery = await getProductsByCategoryBaseQuery(categoryId, true);
  productsQuery.select('product.product_id');
  // Get the list of productIds before applying pagination, sorting...etc
  // Base on this list, we will find all attribute,
  // category and price can be appeared in the filter table
  const allIds = (await productsQuery.execute(pool)).map(
    (row) => row.product_id
  );

  // Filterable attributes
  const query = select('attribute.attribute_name', 'attribute_name')
    .select('attribute.type', 'type')
    .select('attribute.is_filterable', 'is_filterable')
    .select('product_attribute_value_index.attribute_id', 'attribute_id')
    .select('attribute.attribute_code', 'attribute_code')
    .select('product_attribute_value_index.option_id', 'option_id')
    .select('product_attribute_value_index.option_text', 'option_text')
    .from('attribute');
  query
    .innerJoin('product_attribute_value_index')
    .on(
      'attribute.attribute_id',
      '=',
      'product_attribute_value_index.attribute_id'
    );

  query
    .where('product_attribute_value_index.product_id', 'IN', allIds)
    .and('type', '=', 'select')
    .and('is_filterable', '=', 1);

  const attributeData = await query.execute(pool);

  const attributes = [];
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < attributeData.length; i++) {
    const index = attributes.findIndex(
      (a) => a.attributeCode === attributeData[i].attribute_code
    );
    if (index === -1) {
      attributes.push({
        attributeName: attributeData[i].attribute_name,
        attributeId: attributeData[i].attribute_id,
        attributeCode: attributeData[i].attribute_code,
        options: [
          {
            optionId: attributeData[i].option_id,
            optionText: attributeData[i].option_text
          }
        ]
      });
    } else {
      const idx = attributes[index].options.findIndex(
        (o) =>
          parseInt(o.optionId, 10) === parseInt(attributeData[i].option_id, 10)
      );
      if (idx === -1) {
        attributes[index].options = attributes[index].options.concat({
          optionId: attributeData[i].option_id,
          optionText: attributeData[i].option_text
        });
      } else {
        // eslint-disable-next-line no-plusplus
        attributes[index].options[idx].productCount++;
      }
    }
  }

  return attributes;
};
