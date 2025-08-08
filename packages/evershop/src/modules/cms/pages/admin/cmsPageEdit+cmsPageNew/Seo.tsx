import { Card } from '@components/admin/Card.js';
import { InputField } from '@components/common/form/InputField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
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
    <Card title="Search Engine Optimization">
      <Card.Session>
        <div className="space-y-2">
          <InputField
            id="urlKey"
            name="url_key"
            label="URL Key"
            placeholder="Enter URL key"
            defaultValue={page?.urlKey}
            required
            validation={{ required: 'URL key is required' }}
            helperText="This is the URL path for the CMS page."
          />

          <InputField
            id="metaTitle"
            name="meta_title"
            label="Meta Title"
            placeholder="Enter meta title"
            defaultValue={page?.metaTitle}
            required
            validation={{ required: 'Meta title is required' }}
            helperText="This is the meta title for the CMS page."
          />

          <TextareaField
            name="meta_description"
            label="Meta Description"
            placeholder="Enter meta description"
            defaultValue={page?.metaDescription}
          />
        </div>
      </Card.Session>
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
