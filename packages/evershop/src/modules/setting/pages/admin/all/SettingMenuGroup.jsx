import PropTypes from 'prop-types';
import React from 'react';
import CogIcon from '@heroicons/react/solid/esm/CogIcon';
import NavigationItemGroup from '@components/admin/cms/NavigationItemGroup';

export default function CmsMenuGroup({ storeSetting }) {
  return (
    <NavigationItemGroup
      id="settingMenuGroup"
      name="Setting"
      // eslint-disable-next-line react/no-unstable-nested-components
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
