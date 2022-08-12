import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import Icon from '@heroicons/react/solid/esm/ArchiveIcon';

export default function ProductsMenuItem() {
  return <MenuItem Icon={Icon} title="Products" url={buildUrl('productGrid')} />;
}