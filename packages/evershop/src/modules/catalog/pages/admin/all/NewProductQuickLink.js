import React from 'react';
import Icon from '@heroicons/react/solid/esm/ArchiveIcon';
import NavigationItem from '../../../../cms/components/admin/NavigationItem';

export default function NewProductQuickLink({ productNew }) {
  return <NavigationItem
    Icon={Icon}
    title="New Product"
    url={productNew}
  />
}

export const layout = {
  areaId: 'quickLinks',
  sortOrder: 20
}

export const query = `
  query Query {
    productNew: url(routeId:"productNew")
  }
`