import React from 'react';

export default function Index({ post, category }) {
  return <h1>This is CMS page</h1>;
}

export const layout = {
  id: "cmsPage",
  areaId: "content",
  sortOrder: 1
}
