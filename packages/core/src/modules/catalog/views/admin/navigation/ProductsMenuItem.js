import PropTypes from "prop-types"
import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/ArchiveIcon';

export default function ProductsMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="Products" url={url} />;
}

ProductsMenuItem.propTypes = {
  url: PropTypes.string.isRequired
}
