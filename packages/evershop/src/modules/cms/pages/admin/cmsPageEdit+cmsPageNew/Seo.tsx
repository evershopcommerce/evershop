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

interface CmsPageSeoProps {
  page?: {
    urlKey?: string;
    metaTitle?: string;
    metaKeywords?: string;
    metaDescription?: string;
  };
}

export default function Seo({ page }: CmsPageSeoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('SEO Information')}</CardTitle>
        <CardDescription>
          {_('Provide the SEO details for the CMS page.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <InputField
            id="urlKey"
            name="url_key"
            label={_('URL Key')}
            placeholder={_('Enter URL key')}
            defaultValue={page?.urlKey}
            required
            validation={{ required: _('URL key is required') }}
            helperText={_('This is the URL path for the CMS page.')}
          />

          <InputField
            id="metaTitle"
            name="meta_title"
            label={_('Meta Title')}
            placeholder={_('Enter meta title')}
            defaultValue={page?.metaTitle}
            required
            validation={{ required: _('Meta title is required') }}
            helperText={_('This is the meta title for the CMS page.')}
          />

          <TextareaField
            name="meta_description"
            label={_('Meta Description')}
            placeholder={_('Enter meta description')}
            defaultValue={page?.metaDescription}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'wideScreen',
  sortOrder: 30
};

export const query = `
  query Query {
    page: cmsPage(id: getContextValue('cmsPageId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`;
