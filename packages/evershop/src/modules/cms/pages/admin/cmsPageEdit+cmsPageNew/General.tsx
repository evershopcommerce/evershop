import { Card } from '@components/admin/Card.js';
import { Editor, Row } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
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
    <Card title="General">
      <Card.Session>
        <div className="space-y-2">
          <div>
            <InputField
              id="cms_page_name"
              name="name"
              label="Page Name"
              placeholder="Enter page name"
              defaultValue={page?.name}
              required
              validation={{ required: 'Page name is required' }}
              helperText="This is the name of the CMS page that will be displayed in the admin panel."
            />
          </div>
          <div className="space-y-2">
            <RadioGroupField
              name="status"
              label="Status"
              options={[
                { value: 1, label: 'Enabled' },
                { value: 0, label: 'Disabled' }
              ]}
              defaultValue={page?.status}
              required
              helperText="Enable this page to make it visible on the frontend."
            />
          </div>
          <div>
            <label htmlFor="content" className="block mb-2 font-medium">
              Content
            </label>
            <Editor name="content" value={page?.content || []} />
          </div>
        </div>
      </Card.Session>
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
