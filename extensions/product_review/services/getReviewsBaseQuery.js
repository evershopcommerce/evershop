const { select } = require('@evershop/postgres-query-builder');

module.exports.getReviewsBaseQuery = () => {
  const query = select('*').from('product_review');
  query
    .leftJoin('product')
    .on('product.product_id', '=', 'product_review.product_id');
  query
    .leftJoin('product_description')
    .on(
      'product_description.product_description_product_id',
      '=',
      'product.product_id'
    );
  query.select('product_review.uuid', 'uuid');
  return query;
};
