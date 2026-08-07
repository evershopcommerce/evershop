import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { ArchiveBoxIcon } from '@heroicons/react/24/solid';
import { HashtagIcon } from '@heroicons/react/24/solid';
import { LinkIcon } from '@heroicons/react/24/solid';
import { TagIcon } from '@heroicons/react/24/solid';
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
      name="Catalog"
      items={[
        {
          Icon: ArchiveBoxIcon,
          url: productGrid,
          title: 'Products'
        },
        {
          Icon: LinkIcon,
          url: categoryGrid,
          title: 'Categories'
        },
        {
          Icon: TagIcon,
          url: collectionGrid,
          title: 'Collections'
        },
        {
          Icon: HashtagIcon,
          url: attributeGrid,
          title: 'Attributes'
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
