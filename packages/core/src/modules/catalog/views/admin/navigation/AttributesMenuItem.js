import PropTypes from "prop-types"
import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import Icon from '@heroicons/react/solid/esm/HashtagIcon';

export default function AttributesMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="Attributes" url={url} />;
}

AttributesMenuItem.propTypes = {
  url: PropTypes.string.isRequired
}
