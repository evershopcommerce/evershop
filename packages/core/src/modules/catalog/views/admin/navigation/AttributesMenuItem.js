import React from 'react';
import MenuItem from '../../../../cms/views/admin/NavigationItem';
import { buildUrl } from '@evershop/core/src/lib/router/buildUrl';
import Icon from '@heroicons/react/solid/esm/HashtagIcon';

export default function AttributesMenuItem() {
  return <MenuItem Icon={Icon} title="Attributes" url={buildUrl('attribteGrid')} />;
}