import { NavigationItem } from '@components/admin/NavigationItem.js';
import { ArchiveBoxIcon } from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewProductQuickLink({ productNew }) {
  return (
    <NavigationItem
      Icon={ArchiveBoxIcon}
      title="New Product"
      url={productNew}
    />
  );
}

NewProductQuickLink.propTypes = {
  productNew: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'quickLinks',
  sortOrder: 20
};

export const query = `
  query Query {
    productNew: url(routeId:"productNew")
  }
`;
