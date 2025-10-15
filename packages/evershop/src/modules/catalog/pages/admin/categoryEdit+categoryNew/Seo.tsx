import { Card } from '@components/admin/Card.js';
import Area from '@components/common/Area.js';
import { InputField } from '@components/common/form/InputField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import React from 'react';

interface CategorySeoProps {
  category?: {
    urlKey?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
}
export default function Seo({ category }: CategorySeoProps) {
  const fields = [
    {
      component: {
        default: (
          <InputField
            name="url_key"
            label="URL key"
            placeholder="Enter URL key"
            defaultValue={category?.urlKey || ''}
            required
            validation={{
              required: 'URL key is required',
              pattern: {
                value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message:
                  'URL key must be lowercase and can only contain alphanumeric characters and hyphens'
              }
            }}
          />
        )
      },
      sortOrder: 0
    },
    {
      component: {
        default: (
          <InputField
            name="meta_title"
            label="Meta title"
            placeholder="Enter Meta title"
            defaultValue={category?.metaTitle || ''}
            required
            validation={{
              required: 'Meta title is required'
            }}
          />
        )
      },
      sortOrder: 10
    },
    {
      component: {
        default: (
          <TextareaField
            name="meta_description"
            label="Meta description"
            placeholder="Enter Meta description"
            defaultValue={category?.metaDescription || ''}
            required
            validation={{
              required: 'Meta description is required'
            }}
          />
        )
      },
      sortOrder: 30
    }
  ];

  return (
    <Card title="Search engine optimize">
      <Card.Session>
        <Area id="categoryEditSeo" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 60
};

export const query = `
  query Query {
    category(id: getContextValue('categoryId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`;
