import LanguageSwitcher from '@components/common/LanguageSwitcher.js';
import React from 'react';

/**
 * Places the storefront language switcher in the header (right cluster). The switcher
 * itself lives in `components/common/` so themes/extensions can reuse it; this thin
 * wrapper is what gives it a storefront `layout`. It renders `null` when fewer than two
 * locales are enabled, so single-language stores get no extra markup in the header.
 */
export default function HeaderLanguageSwitcher(): React.ReactElement | null {
  return <LanguageSwitcher />;
}

export const layout = {
  areaId: 'headerMiddleRight',
  sortOrder: 1
};
