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
    <div className="cms-page mx-auto max-w-3xl py-8 md:py-12">
      <h1 className="cms__page__heading mb-8 text-3xl font-bold tracking-tight md:text-4xl">
        {page.name}
      </h1>
      <Editor rows={page.content} />
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
