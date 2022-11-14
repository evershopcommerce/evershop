import React from "react";
import Area from "../../../lib/components/Area";
import { Card } from "../../cms/components/admin/Card";

export default function SettingMenu() {
  return <Card>
    <Area
      id='settingMenu'
      noOuter={true}
      coreComponents={[
        {
          component: {
            default: () => <Card.Session title={<a href="/">Store Setting</a>} >
              <div>Configure your store information</div>
            </Card.Session>
          },
          props: {},
          sortOrder: 10
        },
        {
          component: {
            default: () => <Card.Session title={'Payment Setting'}>
              <div>Configure the available payment methods</div>
            </Card.Session>
          },
          props: {},
          sortOrder: 10
        },
        {
          component: {
            default: () => <Card.Session title={'Shipping Setting'}>
              <div>Where you ship, shipping methods and delivery fee</div>
            </Card.Session>
          },
          props: {},
          sortOrder: 10
        }
      ]}
    />

  </Card>
}