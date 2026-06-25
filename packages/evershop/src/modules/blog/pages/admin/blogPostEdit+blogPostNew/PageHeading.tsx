import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogPostEditHeading({
  backUrl,
  post
}: {
  backUrl?: string;
  post?: { name?: string } | null;
}) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        post
          ? _('Editing ${name}', { name: post.name ?? '' })
          : _('Create a new post')
      }
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    post: blogPost(id: getContextValue("blogPostUuid", null)) {
      name
    }
    backUrl: url(routeId: "blogPostGrid")
  }
`;
