import React from "react";
import { Card } from "../../../../cms/components/admin/Card";

export default function StoreSettingMenu({ storeSettingUrl }) {
  return <Card.Session title={<a href={storeSettingUrl}>Store Setting</a>} >
    <div>Configure your store information</div>
  </Card.Session>
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 5
}

export const query = `
  query Query {
    storeSettingUrl: url(routeId: "storeSetting")
  }
`