import { parseImageSizes } from '@evershop/evershop/lib/util/parseImageSizes';
import React from 'react';

export type ImageProps = {
  src: string;
  width: number; // Intrinsic width of the image
  height: number; // Intrinsic height of the image
  alt: string;
  quality?: number;
  priority?: boolean;
  sizes?: string;
  loading?: 'eager' | 'lazy' | undefined;
  decoding?: 'async' | 'auto' | 'sync' | undefined;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' | 'unset';
  style?: React.CSSProperties;
} & React.ImgHTMLAttributes<HTMLImageElement>;

export function Image({
  src,
  width,
  height,
  alt,
  quality = 75,
  loading = 'eager',
  decoding = 'async',
  priority = false,
  sizes = '100vw',
  objectFit = 'unset',
  ...props
}: ImageProps): React.ReactElement | null {
  const generateSrcSet = (): string => {
    const imageSizes = parseImageSizes(sizes);
    // Don't upscale beyond 3 times the original width, but be smarter about filtering
    let filteredSizes = imageSizes.filter((size) => size <= width * 3);

    if (filteredSizes.length < 2) {
      // Add the original width
      filteredSizes.push(width);

      const smallerSizes = [
        Math.round(width * 0.5), // 50% of original
        Math.round(width * 0.75) // 75% of original
      ].filter((size) => size >= 200 && !filteredSizes.includes(size)); // Don't go too small

      filteredSizes = [...filteredSizes, ...smallerSizes];
    }

    if (!filteredSizes.includes(width)) {
      filteredSizes.push(width);
    }

    filteredSizes = [...new Set(filteredSizes)].sort((a, b) => a - b);

    return filteredSizes
      .map((size) => {
        // Construct the URL pointing to our image API
        const url = `/images?src=${encodeURIComponent(
          src
        )}&w=${size}&q=${quality}`;
        return `${url} ${size}w`;
      })
      .join(', ');
  };

  const srcset = generateSrcSet();
  const fallbackSrc = `/images?src=${encodeURIComponent(
    src
  )}&w=${width}&q=${quality}`;

  // Prepare the base style with responsive behavior
  const baseStyle = {
    // Modern responsive image approach
    maxWidth: '100%', // Ensure image doesn't exceed its container
    height: 'auto', // Maintain aspect ratio
    objectFit: objectFit,
    aspectRatio: `${width} / ${height}` // Maintain aspect ratio
  };

  return (
    <img
      {...props}
      src={fallbackSrc}
      srcSet={srcset}
      sizes={sizes}
      alt={alt}
      // Set intrinsic dimensions to help browser calculate aspect ratio
      width={width}
      height={height}
      style={{
        ...baseStyle,
        ...props.style
      }}
      loading={loading}
      decoding={decoding}
      itemProp={priority ? 'preload' : undefined}
    />
  );
}
