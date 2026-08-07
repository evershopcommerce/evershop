import { Card } from '@components/admin/Card.js';
import Area from '@components/common/Area.js';
import { InputField } from '@components/common/form/InputField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import React from 'react';

interface SEOProps {
  product:
    | {
        urlKey: string;
        metaTitle: string;
        metaKeywords: string;
        metaDescription: string;
      }
    | undefined;
}
export default function SEO({ product }: SEOProps) {
  const fields = [
    {
      component: {
        default: (
          <InputField
            name="url_key"
            label="URL Key"
            placeholder="Enter URL Key"
            required
            defaultValue={product?.urlKey}
            validation={{
              required: 'URL Key is required',
              pattern: {
                value: /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
                message:
                  'URL Key must be lowercase and can only contain letters, numbers, and hyphens'
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
            label="Meta Title"
            placeholder="Enter Meta Title"
            required
            defaultValue={product?.metaTitle}
            validation={{
              required: 'Meta Title is required'
            }}
          />
        )
      },
      sortOrder: 10
    },
    {
      component: {
        default: (
          <InputField
            type="hidden"
            name="meta_keywords"
            defaultValue={product?.metaKeywords}
          />
        )
      },
      sortOrder: 20
    },
    {
      component: {
        default: (
          <TextareaField
            name="meta_description"
            label="Meta Description"
            placeholder="Enter Meta Description"
            defaultValue={product?.metaDescription}
          />
        )
      },
      sortOrder: 30
    }
  ];

  return (
    <Card title="Search engine optimize">
      <Card.Session>
        <Area id="productEditSeo" coreComponents={fields} />
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
    product(id: getContextValue('productId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`;
