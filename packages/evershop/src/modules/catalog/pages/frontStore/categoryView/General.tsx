import React from 'react';
import './General.scss';
import { Editor } from '@components/common/Editor.js';

interface CategoryInfoProps {
  category: {
    name: string;
    description: Array<{
      id: string;
      size: number;
      columns: Array<{
        id: string;
        size: number;
        data: Record<string, any>;
      }>;
    }>;
    image?: {
      url: string;
    };
  };
}
export default function CategoryInfo({
  category: { name, description, image }
}: CategoryInfoProps) {
  return (
    <div className="page-width">
      <div className="mb-2 md:mb-5 category__general">
        {image && (
          <img src={image.url} alt={name} className="category__image" />
        )}
        <div className="category__info prose prose-base max-w-none">
          <h1 className="category__name">{name}</h1>
          <div className="category__description">
            <Editor rows={description} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    category: currentCategory {
      name
      description
      image {
        alt
        url
      }
    }
}`;
