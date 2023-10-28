import PropTypes from 'prop-types';
import React from 'react';
import ProductMediaManager from '@components/admin/catalog/productEdit/media/ProductMediaManager';
import { Card } from '@components/admin/cms/Card';

export default function Media({ id, product, productImageUploadUrl }) {
  const image = product?.image;
  let gallery = product?.gallery || [];

  if (image) {
    gallery = [image].concat(gallery);
  }
  return (
    <Card title="Media">
      <Card.Session>
        <ProductMediaManager
          id={id || 'images'}
          productImages={gallery}
          productImageUploadUrl={productImageUploadUrl}
        />
      </Card.Session>
    </Card>
  );
}

Media.propTypes = {
  id: PropTypes.string.isRequired,
  product: PropTypes.shape({
    gallery: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired
      })
    ),
    image: PropTypes.shape({
      id: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired
    })
  }),
  productImageUploadUrl: PropTypes.string.isRequired
};

Media.defaultProps = {
  product: null
};

export const layout = {
  areaId: 'leftSide',
  sortOrder: 15
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      image {
        id: uuid
        url
      }
      gallery {
        id: uuid
        url
      }
    }
    productImageUploadUrl: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
  }
`;
