import { NavigationItem } from '@components/admin/cms/NavigationItem';
import Icon from '@heroicons/react/solid/esm/DocumentIcon';
import PropTypes from 'prop-types';
import React from 'react';

export default function PagesMenuItem({ url }) {
  return <NavigationItem Icon={Icon} title="Pages" url={url} />;
}

PagesMenuItem.propTypes = {
  url: PropTypes.string.isRequired
};
