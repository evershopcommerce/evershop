import React from 'react';

/**
 * The page-builder editor renders its own full-bleed layout (topbar + canvas
 * + drawer), so we need a no-op heading slot. The standard `PageHeading`
 * pattern doesn't fit because we replace the whole admin chrome.
 */
export default function PageBuilderEditHeading() {
  return null;
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};
