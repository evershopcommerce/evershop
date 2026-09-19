import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Box, Hash, Link, Tag } from 'lucide-react';
import PropTypes from 'prop-types';
import React from 'react';

export default function CatalogMenuGroup({
  productGrid,
  categoryGrid,
  attributeGrid,
  collectionGrid
}) {
  return (
    <NavigationItemGroup
      id="catalogMenuGroup"
      name={_('Catalog')}
      items={[
        {
          Icon: Box,
          url: productGrid,
          title: _('Products')
        },
        {
          Icon: Link,
          url: categoryGrid,
          title: _('Categories')
        },
        {
          Icon: Tag,
          url: collectionGrid,
          title: _('Collections')
        },
        {
          Icon: Hash,
          url: attributeGrid,
          title: _('Attributes')
        }
      ]}
    />
  );
}

CatalogMenuGroup.propTypes = {
  attributeGrid: PropTypes.string.isRequired,
  categoryGrid: PropTypes.string.isRequired,
  collectionGrid: PropTypes.string.isRequired,
  productGrid: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 20
};

export const query = `
  query Query {
    productGrid: url(routeId:"productGrid")
    categoryGrid: url(routeId:"categoryGrid")
    attributeGrid: url(routeId:"attributeGrid")
    collectionGrid: url(routeId:"collectionGrid")
  }
`;
