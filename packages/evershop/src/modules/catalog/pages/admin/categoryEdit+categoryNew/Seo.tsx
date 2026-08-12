import { SearchSnippetPreview } from '@components/admin/SearchSnippetPreview.js';
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
import { useWatch } from 'react-hook-form';

interface CategorySeoProps {
  category?: {
    name?: string;
    urlKey?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
}

// Live SERP preview. A category's canonical URL is root-level (`/<url_key>` for
// top-level; nested categories prepend their parent path — see
// catalog/subscribers/category_created/buildUrlRewrite.ts), so the prefix is
// `/`. Watches the SEO fields plus `name` (registered on the General tab —
// same form) so the snippet updates as the merchant types; falls back to the
// persisted category name for the title when the meta title is blank.
function SnippetPreview({ name }: { name?: string }) {
  const urlKey = useWatch({ name: 'url_key' });
  const metaTitle = useWatch({ name: 'meta_title' });
  const metaDescription = useWatch({ name: 'meta_description' });
  const watchedName = useWatch({ name: 'name' });
  return (
    <SearchSnippetPreview
      pathPrefix="/"
      name={watchedName ?? name}
      urlKey={urlKey}
      metaTitle={metaTitle}
      metaDescription={metaDescription}
    />
  );
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
    },
    {
      component: {
        default: <SnippetPreview name={category?.name} />
      },
      sortOrder: 40
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
      name
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`;
