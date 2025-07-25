import React, { useState } from 'react';
import './Image.scss';
import { Card } from '@components/admin/Card.js';
import { Image, ImageUploader } from '@components/admin/ImageUploader.js';

interface ImageProps {
  category?: {
    image?: Image;
  };
}

export default function Image({ category }: ImageProps) {
  const [image, setImage] = useState(category?.image);
  return (
    <Card
      title="Category banner"
      actions={
        image
          ? [
              {
                name: 'Remove',
                variant: 'critical',
                onAction: () => setImage(undefined)
              }
            ]
          : []
      }
    >
      <Card.Session>
        <ImageUploader
          onUpload={(images) => {
            if (images.length > 0) {
              setImage(images[0]);
            }
          }}
          isMultiple={false}
          allowDelete={false}
          currentImages={image ? [image] : []}
          targetPath={`catalog/${
            Math.floor(Math.random() * (9999 - 1000)) + 1000
          }/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`}
        />
        {image && <input type="hidden" value={image.url} name="image" />}
        {!image && <input type="hidden" value="" name="image" />}
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    category(id: getContextValue("categoryId", null)) {
      image {
        id: uuid
        url
      }
    }
  }
`;
