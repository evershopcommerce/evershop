import { Card } from '@components/admin/cms/Card';
import PropTypes from 'prop-types';
import React from 'react';

export default function PaymentSettingMenu({ paymentSettingUrl }) {
  return (
    <Card.Session title={<a href={paymentSettingUrl}>Payment Setting</a>}>
      <div>Configure the available payment methods</div>
    </Card.Session>
  );
}

PaymentSettingMenu.propTypes = {
  paymentSettingUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 10
};

export const query = `
  query Query {
    paymentSettingUrl: url(routeId: "paymentSetting")
  }
`;
