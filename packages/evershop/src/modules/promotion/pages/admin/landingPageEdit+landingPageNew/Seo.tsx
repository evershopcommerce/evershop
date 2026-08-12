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

interface LandingPageSeoProps {
  landingPage?: {
    name?: string;
    urlKey?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
}

// Live SERP preview. Landing pages live at the root (`/<url_key>`), so the
// prefix is `/`. Watches the SEO fields plus `name` (registered on the General
// tab — same form) so the snippet updates as the merchant types; falls back to
// the persisted name for the title when the meta title is blank.
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

export default function Seo({ landingPage }: LandingPageSeoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('SEO Information')}</CardTitle>
        <CardDescription>
          {_('Provide the SEO details for the landing page.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <InputField
            id="urlKey"
            name="url_key"
            label={_('URL Key')}
            placeholder={_('Enter URL key')}
            defaultValue={landingPage?.urlKey}
            required
            validation={{ required: _('URL key is required') }}
            helperText={_('This is the URL path for the landing page.')}
          />

          <InputField
            id="metaTitle"
            name="meta_title"
            label={_('Meta Title')}
            placeholder={_('Enter meta title')}
            defaultValue={landingPage?.metaTitle}
          />

          <TextareaField
            name="meta_description"
            label={_('Meta Description')}
            placeholder={_('Enter meta description')}
            defaultValue={landingPage?.metaDescription}
          />

          <SnippetPreview name={landingPage?.name} />
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
    landingPage(id: getContextValue("landingPageId", null)) {
      name
      urlKey
      metaTitle
      metaDescription
    }
  }
`;
