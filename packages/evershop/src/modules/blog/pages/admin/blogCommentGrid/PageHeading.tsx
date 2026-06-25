import { PageHeading } from '@components/admin/PageHeading.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogCommentHeading() {
  return <PageHeading heading={_('Blog Comments')} />;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
