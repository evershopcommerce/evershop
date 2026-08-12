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

interface SEOProps {
  product:
    | {
        name?: string;
        urlKey: string;
        metaTitle: string;
        metaKeywords: string;
        metaDescription: string;
      }
    | undefined;
  duplicateSource?: {
    productId: number;
  } | null;
}

// Live SERP preview. Products resolve at the root (`/<url_key>` — see
// catalog/subscribers/product_created/buildUrlRewrite.ts), so the prefix is
// `/`. Watches the SEO fields plus `name` (registered on the General tab —
// same form) so the snippet updates as the merchant types; falls back to the
// persisted product name for the title when the meta title is blank.
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

export default function SEO({ product, duplicateSource }: SEOProps) {
  // Duplicate mode: the url_key is unique — suffix the prefilled default.
  const defaultUrlKey =
    duplicateSource && product?.urlKey
      ? `${product.urlKey}-copy`
      : product?.urlKey;
  const fields = [
    {
      component: {
        default: (
          <InputField
            name="url_key"
            label={_('URL Key')}
            placeholder={_('Enter URL Key')}
            required
            defaultValue={defaultUrlKey}
            validation={{
              required: _('URL Key is required'),
              pattern: {
                value: /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/,
                message: _(
                  'URL Key must be lowercase and can only contain letters, numbers, and hyphens'
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
            label={_('Meta Title')}
            placeholder={_('Enter Meta Title')}
            required
            defaultValue={product?.metaTitle}
            validation={{
              required: _('Meta Title is required')
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
            label={_('Meta Description')}
            placeholder={_('Enter Meta Description')}
            defaultValue={product?.metaDescription || ''}
          />
        )
      },
      sortOrder: 30
    },
    {
      component: {
        default: <SnippetPreview name={product?.name} />
      },
      sortOrder: 40
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('SEO')}</CardTitle>
        <CardDescription>{_('Manage the SEO settings.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Area
          id="productEditSeo"
          coreComponents={fields}
          className="flex flex-col gap-2"
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
    product(id: getContextValue('productId', null)) {
      name
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
    duplicateSource: product(id: getContextValue("duplicateSourceId", null)) {
      productId
    }
  }
`;
