import React from 'react';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import MenuItem from '../NavigationItem';
import Icon from '@heroicons/react/solid/esm/HomeIcon';

export default function DashboardMenuItem() {
  return <MenuItem Icon={Icon} title="Dashboard" url={buildUrl('dashboard')} />;
}