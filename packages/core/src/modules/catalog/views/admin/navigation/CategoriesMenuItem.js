import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import Icon from '@heroicons/react/solid/esm/TagIcon';

export default function CategoriesMenuItem() {
  return <MenuItem Icon={Icon} title="Categories" url={buildUrl('categoryGrid')} />;
}