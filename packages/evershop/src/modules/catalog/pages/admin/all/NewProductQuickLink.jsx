import { NavigationItem } from '@components/admin/cms/NavigationItem';
import Icon from '@heroicons/react/solid/esm/ArchiveIcon';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewProductQuickLink({ productNew }) {
  return <NavigationItem Icon={Icon} title="New Product" url={productNew} />;
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
