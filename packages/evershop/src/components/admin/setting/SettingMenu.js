import React from 'react';
import Area from '@components/common/Area';
import { Card } from '@components/admin/cms/Card';
import './SettingMenu.scss';

export default function SettingMenu() {
  return (
    <div className="setting-page-menu">
      <Card>
        <Area id="settingPageMenu" noOuter coreComponents={[]} />
      </Card>
    </div>
  );
}
