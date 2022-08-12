import PropTypes from "prop-types"
import React from 'react';
import MenuItem from '../NavigationItem';
import Icon from '@heroicons/react/solid/esm/HomeIcon';

export default function DashboardMenuItem({ url }) {
  return <MenuItem Icon={Icon} title="Dashboard" url={url} />;
}

DashboardMenuItem.propTypes = {
  url: PropTypes.string.isRequired
}
