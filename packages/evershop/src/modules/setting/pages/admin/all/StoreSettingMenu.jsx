import { Card } from '@components/admin/cms/Card';
import PropTypes from 'prop-types';
import React from 'react';

export default function StoreSettingMenu({ storeSettingUrl }) {
  return (
    <Card.Session title={<a href={storeSettingUrl}>Store Setting</a>}>
      <div>Configure your store information</div>
    </Card.Session>
  );
}

StoreSettingMenu.propTypes = {
  storeSettingUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 5
};

export const query = `
  query Query {
    storeSettingUrl: url(routeId: "storeSetting")
  }
`;
