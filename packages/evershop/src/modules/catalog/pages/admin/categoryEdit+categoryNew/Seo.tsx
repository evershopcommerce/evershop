import Area from '@components/common/Area.js';
import { InputField } from '@components/common/form/InputField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
            label={_('URL key')}
            placeholder={_('Enter URL key')}
            defaultValue={category?.urlKey || ''}
            required
            validation={{
              required: _('URL key is required'),
              pattern: {
                value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: _(
                  'URL key must be lowercase and can only contain alphanumeric characters and hyphens'
                )
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
            label={_('Meta title')}
            placeholder={_('Enter Meta title')}
            defaultValue={category?.metaTitle || ''}
            required
            validation={{
              required: _('Meta title is required')
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
            label={_('Meta description')}
            placeholder={_('Enter Meta description')}
            defaultValue={category?.metaDescription || ''}
            required
            validation={{
              required: _('Meta description is required')
            }}
          />
        )
      },
      sortOrder: 30
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Search engine optimize')}</CardTitle>
        <CardDescription>
          {_('Manage the SEO settings of the category.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Area
          id="categoryEditSeo"
          coreComponents={fields}
          className="space-y-2"
        />
      </CardContent>
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
