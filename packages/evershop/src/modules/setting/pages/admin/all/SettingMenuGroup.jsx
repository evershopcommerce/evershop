import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { CogIcon } from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import React from 'react';

export default function CmsMenuGroup({ storeSetting }) {
  return (
    <NavigationItemGroup
      id="settingMenuGroup"
      name="Setting"
      Icon={() => <CogIcon width={15} height={15} />}
      url={storeSetting}
    />
  );
}

CmsMenuGroup.propTypes = {
  storeSetting: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 500
};

export const query = `
  query Query {
    storeSetting: url(routeId:"storeSetting")
  }
`;
