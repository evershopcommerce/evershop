import PropTypes from "prop-types"
import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/ArchiveIcon';

export default function NewProductMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="New product" url={url} />;
}

NewProductMenuItem.propTypes = {
  url: PropTypes.string.isRequired
}
