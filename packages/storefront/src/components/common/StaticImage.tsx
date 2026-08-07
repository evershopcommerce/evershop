import { useAppState } from '@components/common/context/app.js';
import { Image, ImageProps } from '@components/common/Image.js';
import React, { useMemo } from 'react';

export interface StaticImageProps extends Omit<ImageProps, 'src'> {
  subPath: string; // Path relative to the root public folder or the public folder of the active theme
}

export const StaticImage: React.FC<StaticImageProps> = ({
  subPath,
  quality = 75,
  ...props
}) => {
  const { graphqlResponse } = useAppState();
  const baseUrl = graphqlResponse?.pageMeta?.baseUrl || '';

  const imagePath = useMemo(() => {
    const formattedSubPath = subPath.startsWith('/')
      ? subPath.substring(1)
      : subPath;

    return `${baseUrl}/assets/${formattedSubPath}`;
  }, [baseUrl, subPath]);

  return <Image src={imagePath} quality={quality} {...props} />;
};
