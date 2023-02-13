import PropTypes from 'prop-types';
import React from 'react';
import Icon from '@heroicons/react/solid/esm/DocumentIcon';
import MenuItem from '../NavigationItem';

export default function PagesMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="Pages" url={url} />;
}

PagesMenuItem.propTypes = {
  url: PropTypes.string.isRequired
};
