import PropTypes from 'prop-types';

export const VariantType = PropTypes.shape({
  attributes: PropTypes.shape({
    find: PropTypes.func
  }),
  editUrl: PropTypes.string,
  id: PropTypes.number,
  images: PropTypes.arrayOf(PropTypes.shape({

  })),
  price: PropTypes.number,
  qty: PropTypes.string,
  sku: PropTypes.string,
  status: PropTypes.number,
  variant_product_id: PropTypes.number,
  visibility: PropTypes.number
});
