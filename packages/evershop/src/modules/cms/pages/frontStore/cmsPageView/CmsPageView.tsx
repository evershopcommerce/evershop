import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import React from 'react';

interface CmsPage {
  name: string;
  content: Row[];
}

interface CmsPageViewProps {
  page: CmsPage;
}
export default function CmsPageView({ page }: CmsPageViewProps) {
  return (
    <div className="page-width">
      <div className="prose prose-base max-w-none">
        <h1 className="cms__page__heading text-center text-3xl">{page.name}</h1>
        <Editor rows={page.content} />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};

export const query = `
  query Query {
    page: currentCmsPage {
      name
      content
    }
  }
`;
