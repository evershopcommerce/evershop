import React from 'react';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import MenuItem from '../NavigationItem';
import Icon from '@heroicons/react/solid/esm/DocumentIcon';

export default function PagesMenuItem() {
  return <MenuItem Icon={Icon} title="Pages" url={buildUrl('cmsPageGrid')} />;
}