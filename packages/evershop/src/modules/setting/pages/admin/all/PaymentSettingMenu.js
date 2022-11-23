import React from "react";
import { Card } from "../../../../cms/components/admin/Card";

export default function PaymentSettingMenu({ paymentSettingUrl }) {
  return <Card.Session title={<a href={paymentSettingUrl}>Payment Setting</a>} >
    <div>Configure the available payment methods</div>
  </Card.Session>
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 10
}

export const query = `
  query Query {
    paymentSettingUrl: url(routeId: "paymentSetting")
  }
`