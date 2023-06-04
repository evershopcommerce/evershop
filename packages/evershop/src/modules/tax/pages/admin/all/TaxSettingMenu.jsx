import PropTypes from 'prop-types';
import React from 'react';
import { Card } from '@components/admin/cms/Card';

export default function TaxSettingMenu({ taxSettingUrl }) {
  return (
    <Card.Session title={<a href={taxSettingUrl}>Tax Setting</a>}>
      <div>Configure tax classes and tax rates</div>
    </Card.Session>
  );
}

TaxSettingMenu.propTypes = {
  taxSettingUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 20
};

export const query = `
  query Query {
    taxSettingUrl: url(routeId: "taxSetting")
  }
`;
