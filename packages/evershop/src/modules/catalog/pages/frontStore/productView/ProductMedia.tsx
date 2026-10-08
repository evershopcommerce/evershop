import { Media } from '@components/frontStore/catalog/Media.js';
import React from 'react';

/**
 * Product page block: the image gallery. A page component rather than an inline entry of the
 * `ProductView` shell so a theme can move it from `layouts.json`. It reads `ProductProvider`,
 * so it must stay inside the product page shell's Areas; placed elsewhere it throws.
 */
export default function ProductMediaBlock(): React.ReactElement {
  return <Media />;
}

export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 0
};
