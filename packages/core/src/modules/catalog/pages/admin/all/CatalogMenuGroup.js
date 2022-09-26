import React from 'react';
import AttributeIcon from '@heroicons/react/solid/esm/HashtagIcon';
import CategoryIcon from '@heroicons/react/solid/esm/TagIcon';
import ProductIcon from '@heroicons/react/solid/esm/ArchiveIcon';
import NavigationItemGroup from '../../../../cms/components/admin/NavigationItemGroup';

export default function CatalogMenuGroup({ productGrid, categoryGrid, attributeGrid }) {
  return <NavigationItemGroup
    id="catalogMenuGroup"
    name="Catalog"
    items={[
      {
        Icon: ProductIcon,
        url: productGrid,
        title: "Products"
      },
      {
        Icon: CategoryIcon,
        url: categoryGrid,
        title: "Categories"
      },
      {
        Icon: AttributeIcon,
        url: attributeGrid,
        title: "Attributes"
      }
    ]}
  />
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 20
}

export const query = `
  query Query {
    productGrid: url(routeId:"productGrid")
    categoryGrid: url(routeId:"categoryGrid")
    attributeGrid: url(routeId:"attributeGrid")
  }
`