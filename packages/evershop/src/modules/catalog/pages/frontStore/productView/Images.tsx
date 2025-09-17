import { Image } from '@components/frontStore/Image.js';
import React from 'react';

function Current({ image }: { image: { alt: string; url: string } }) {
  return (
    <div
      id="product-current-image"
      style={{ background: '#f6f6f6' }}
      className="product-image product-single-page-image flex justify-center items-center"
    >
      <Image
        src={image.url}
        alt={image.alt}
        className="self-center"
        width={500}
        height={500}
      />
    </div>
  );
}

interface ImagesProps {
  product: {
    uuid: string;
    image: {
      alt: string;
      url: string;
    };
    gallery: Array<{
      alt: string;
      url: string;
    }>;
  };
}

export default function Images({
  product: { uuid, image, gallery = [] }
}: ImagesProps) {
  const [current, setCurrent] = React.useState(image);
  const [thumbs, setThumbs] = React.useState(gallery);

  React.useEffect(() => {
    setCurrent(image);
    setThumbs(() => {
      const gls = [...gallery];
      if (image) {
        // Add image to beginning of gallery
        gls.unshift(image);
      }
      return gls;
    });
  }, [uuid]);

  return (
    <div className="product-single-media">
      <Current image={current} />
      <ul className="more-view-thumbnail product-gallery mt-5 grid grid-cols-4 gap-2">
        {thumbs.map((i, j) => (
          <li key={j} className="flex justify-center items-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrent({ ...i });
              }}
              className=""
            >
              <Image
                className="self-center"
                src={i.url}
                alt={i.alt}
                width={100}
                height={100}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 10
};

export const query = `
  query Query {
    product: currentProduct {
      uuid
      image {
        alt
        url
      }
      gallery {
        alt
        url
      }
  }
}`;
