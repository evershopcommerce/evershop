import React from 'react';
import './Thumbnail.scss';
import { ProductNoThumbnail } from '@components/common/ProductNoThumbnail.js';

interface ThumbnailProps {
  url: string;
  imageUrl: string;
  alt?: string;
}
const Thumbnail: React.FC<ThumbnailProps> = ({ url, imageUrl, alt }) => {
  return (
    <div className="product-thumbnail-listing">
      {imageUrl && (
        <a href={url}>
          <img src={imageUrl} alt={alt} />
        </a>
      )}
      {!imageUrl && (
        <a href={url}>
          <ProductNoThumbnail width={100} height={100} />
        </a>
      )}
    </div>
  );
};

export { Thumbnail };
