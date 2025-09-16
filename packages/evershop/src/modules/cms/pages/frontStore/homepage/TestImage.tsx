import { Image } from '@components/frontStore/Image.js';
import React from 'react';
import { ComponentLayout } from '../../../../../types/componentLayout.js';

export default function TestImage() {
  return (
    <div>
      <Image
        src="/media/bradley-andrews-9-opXPsl1rI-unsplash.jpg"
        alt="Test Image"
        width={500}
        height={300}
        quality={75}
        priority={true}
      />
      {/* <img src="http://localhost:3000/images?src=%2Fmedia%2Fbradley-andrews-9-opXPsl1rI-unsplash.jpg&w=1920&q=75" /> */}
      <div className="w-full h-96"></div>
      <Image
        src="/media/car.jpg"
        alt="Car Image"
        width={500}
        height={300}
        quality={75}
        loading="eager"
      />
    </div>
  );
}

export const layout: ComponentLayout = {
  areaId: 'content',
  sortOrder: 10
};
