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
      <div className="mb-2 md:mb-5 category__general">
        {image && (
          <Image
            className="category__image mb-5"
            src={image.url}
            alt={image.alt || name}
            width={1800}
            height={1029}
            priority={true}
          />
        )}
        <div className="category__info prose prose-base page-width">
          <h1 className="category__name">{name}</h1>
          <div className="category__description">
            <Editor rows={description} />
          </div>
        </div>
      </div>
      <Area id="afterCategoryInfo" noOuter />
    </>
  );
}
