import { Card } from '@components/admin/Card.js';
import Area from '@components/common/Area.js';
import React from 'react';
import './SettingMenu.scss';

export function SettingMenu() {
  return (
    <div className="setting-page-menu">
      <Card>
        <Area id="settingPageMenu" noOuter coreComponents={[]} />
      </Card>
    </div>
  );
}
