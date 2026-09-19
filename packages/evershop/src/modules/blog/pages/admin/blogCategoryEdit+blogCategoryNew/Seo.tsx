import { SearchSnippetPreview } from '@components/admin/SearchSnippetPreview.js';
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

interface BlogCategorySeoProps {
  category?: {
    name?: string;
    urlKey?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
}

function SnippetPreview({ name }: { name?: string }) {
  const urlKey = useWatch({ name: 'url_key' });
  const metaTitle = useWatch({ name: 'meta_title' });
  const metaDescription = useWatch({ name: 'meta_description' });
  return (
    <SearchSnippetPreview
      pathPrefix="/blog/category/"
      name={name}
      urlKey={urlKey}
      metaTitle={metaTitle}
      metaDescription={metaDescription}
    />
  );
}

export default function Seo({ category }: BlogCategorySeoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Search Engine Optimization')}</CardTitle>
        <CardDescription>
          {_('URL key is auto-generated from the name if left blank.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <InputField
            prefixIcon="/blog/category/"
            id="urlKey"
            name="url_key"
            label={_('URL Key')}
            placeholder={_('Leave blank to auto-generate')}
            defaultValue={category?.urlKey}
            helperText={_('The URL path segment under /blog/category/.')}
          />
          <InputField
            id="metaTitle"
            name="meta_title"
            label={_('Meta Title')}
            placeholder={_('Enter meta title')}
            defaultValue={category?.metaTitle}
          />
          <TextareaField
            name="meta_description"
            label={_('Meta Description')}
            placeholder={_('Enter meta description')}
            defaultValue={category?.metaDescription}
          />
          <SnippetPreview name={category?.name} />
        </div>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 20
};

export const query = `
  query Query {
    category: blogCategory(id: getContextValue("blogCategoryUuid", null)) {
      name
      urlKey
      metaTitle
      metaDescription
    }
  }
`;
