import React from "react";
import Area from "../../../lib/components/Area";
import { Card } from "../../cms/components/admin/Card";
import './SettingMenu.scss';

export default function SettingMenu() {
  return <div className="setting-page-menu">
    <Card>
      <Area
        id='settingPageMenu'
        noOuter={true}
        coreComponents={[]}
      />
    </Card>
  </div>
}