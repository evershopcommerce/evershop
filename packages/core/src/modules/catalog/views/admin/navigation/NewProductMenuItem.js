import React from 'react';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/ArchiveIcon';

export default function NewProductMenuItem() {
  return <MenuItem Icon={Icon} title="New product" url={buildUrl('productNew')} />;
}