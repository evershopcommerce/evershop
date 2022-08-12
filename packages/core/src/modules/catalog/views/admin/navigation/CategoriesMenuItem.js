import PropTypes from "prop-types"
import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/TagIcon';

export default function CategoriesMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="Categories" url={url} />;
}

CategoriesMenuItem.propTypes = {
  url: PropTypes.string.isRequired
}
