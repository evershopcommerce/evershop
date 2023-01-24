import React from 'react';

export default function Page({ page }) {
  return (
    <div className="page-width">
      <h1 className="text-center mb-3">{page.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};

export const query = `
  query Query {
    page: cmsPage(id: getContextValue("pageId")) {
      name
      content
    }
  }
`;
