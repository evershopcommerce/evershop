import { Card } from '@components/admin/cms/Card';
import Area from '@components/common/Area';
import React from 'react';
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
