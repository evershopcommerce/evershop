import React from 'react';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/CubeIcon';

export default function OrdersMenuItem() {
  return <MenuItem Icon={Icon} title="Orders" url={buildUrl('orderGrid')} />;
}