import { Card } from '@components/admin/cms/Card';
import PropTypes from 'prop-types';
import React from 'react';

export default function ShippingSettingMenu({ shippingSettingUrl }) {
  return (
    <Card.Session title={<a href={shippingSettingUrl}>Shipping Setting</a>}>
      <div>Where you ship, shipping methods and delivery fee</div>
    </Card.Session>
  );
}

ShippingSettingMenu.propTypes = {
  shippingSettingUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 15
};

export const query = `
  query Query {
    shippingSettingUrl: url(routeId: "shippingSetting")
  }
`;
