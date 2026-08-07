import Area from '@components/common/Area.js';
import { Editor } from '@components/common/Editor.js';
import { Image } from '@components/common/Image.js';
import { useCategory } from '@components/frontStore/catalog/CategoryContext.js';
import React from 'react';

export function CategoryInfo() {
  const { name, description, image } = useCategory();
  return (
    <>
      <Area id="beforeCategoryInfo" noOuter />
      <div className="category__general mb-10">
        {image && (
          <div className="category__image mb-8 overflow-hidden">
            <Image
              src={image.url}
              alt={image.alt || name}
              width={1800}
              height={1029}
              priority={true}
              className="w-full object-cover"
            />
          </div>
        )}
        <div className="category__info page-width">
          <h1 className="category__name mb-3">{name}</h1>
          <div className="category__description max-w-2xl text-textSubdued">
            <Editor rows={description} />
          </div>
        </div>
      </div>
      <Area id="afterCategoryInfo" noOuter />
    </>
  );
}
