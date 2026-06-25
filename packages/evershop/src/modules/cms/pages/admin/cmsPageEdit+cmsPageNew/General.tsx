import { Editor, Row } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CmsPageGeneralProps {
  page?: {
    cmsPageId?: string;
    name?: string;
    status?: number;
    sortOrder?: number;
    content?: Row[];
  };
}

export default function General({ page }: CmsPageGeneralProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('General Information')}</CardTitle>
        <CardDescription>
          {_('Provide the basic information for the CMS page.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <InputField
              id="cms_page_name"
              name="name"
              label={_('Page Name')}
              placeholder={_('Enter page name')}
              defaultValue={page?.name}
              required
              validation={{ required: _('Page name is required') }}
              helperText={_(
                'This is the name of the CMS page that will be displayed in the admin panel.'
              )}
            />
          </div>
          <div className="space-y-2">
            <RadioGroupField
              name="status"
              label={_('Status')}
              options={[
                { value: 1, label: _('Enabled') },
                { value: 0, label: _('Disabled') }
              ]}
              defaultValue={page?.status}
              required
              helperText={_(
                'Enable this page to make it visible on the frontend.'
              )}
            />
          </div>
          <div>
            <label htmlFor="content" className="block mb-2 font-medium">
              {_('Content')}
            </label>
            <Editor name="content" value={page?.content || []} enableProductList />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'wideScreen',
  sortOrder: 10
};

export const query = `
  query Query {
    page: cmsPage(id: getContextValue("cmsPageId", null)) {
      cmsPageId
      name
      status
      sortOrder
      content
    }
  }
`;
