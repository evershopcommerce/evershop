import Area from '@components/common/Area.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Settings navigation column. One bordered list with hairline-separated rows
 * (see `SettingMenuItem`) rather than a stack of separate cards — it is a
 * single navigation group, so it should read as one object.
 *
 * `<nav>` + block-level links is deliberate: `Area` renders children into a
 * Fragment under `noOuter`, but injects a wrapper div in dev debug mode, so a
 * `<ul>`/`<li>` structure would be invalid HTML on that path.
 */
export function SettingMenu() {
  return (
    <nav
      aria-label={_('Settings')}
      className="setting-page-menu border-border divide-border bg-card divide-y overflow-hidden rounded-lg border"
    >
      <Area id="settingPageMenu" noOuter coreComponents={[]} />
    </nav>
  );
}
