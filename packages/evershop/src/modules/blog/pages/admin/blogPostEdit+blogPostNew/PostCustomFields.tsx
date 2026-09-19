import { MetafieldSection } from '@components/admin/metafield/MetafieldSection.js';
import React from 'react';

export default function PostCustomFields({
  post
}: {
  post?: {
    metaData?: Record<string, unknown>;
  } | null;
}): React.ReactElement {
  return <MetafieldSection ownerType="blog_post" values={post?.metaData} />;
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 15
};

// `metaData` is exposed admin-only (BlogPost.admin.graphql) so the editor can
// prefill current values. Blog admin queries are uuid-as-id (blogPostUuid) —
// the numeric-id form silently returns null. On blogPostNew the post is null
// and values are empty.
export const query = `
  query Query {
    post: blogPost(id: getContextValue("blogPostUuid", null)) {
      metaData
    }
  }
`;
