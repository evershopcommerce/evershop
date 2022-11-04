import React from "react";
import Area from "../../../lib/components/Area";

export default function SettingMenu() {
  return <Card>
    <Card.Session title={'Setting'}>
      <Area
        id='settingMenu'
        noOuter={true}
        coreComponents={[
          {
            component: () => <div>abc</div>,
            props: {},
            sortOrder: 10
          }
        ]}
      />
    </Card.Session>
  </Card>
}