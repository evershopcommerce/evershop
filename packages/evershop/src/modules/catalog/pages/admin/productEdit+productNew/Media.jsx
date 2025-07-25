import { Card } from '@components/admin/Card';
import { ImageUploader } from '@components/admin/ImageUploader.js';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

export default function Media({ id, product, productImageUploadUrl }) {
  const [images, setImages] = useState(
    product?.image ? [product.image].concat(product?.gallery || []) : []
  );

  return (
    <Card title="Media">
      <Card.Session>
        <ImageUploader
          currentImages={images}
          allowDelete={true}
          allowSwap={true}
          onDelete={(image) => {
            setImages((prevImages) =>
              prevImages.filter((i) => i.id !== image.id)
            );
          }}
          onUpload={(images) => {
            setImages((prevImages) => [...prevImages, ...images]);
          }}
          onSortEnd={(oldIndex, newIndex) => {
            const newImages = [...images];
            const [movedImage] = newImages.splice(oldIndex, 1);
            newImages.splice(newIndex, 0, movedImage);
            setImages(newImages);
          }}
          targetPath={`catalog/${
            Math.floor(Math.random() * (9999 - 1000)) + 1000
          }/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`}
        />
        {images.map((image) => (
          <input
            key={image.id}
            type="hidden"
            name="images[]"
            value={image.url}
          />
        ))}
      </Card.Session>
    </Card>
  );
}

Media.propTypes = {
  id: PropTypes.string,
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
  id: 'images',
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
