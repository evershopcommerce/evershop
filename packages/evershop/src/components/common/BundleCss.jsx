import { useAppState } from '@components/common/context/app';
import { get } from '@evershop/evershop/src/lib/util/get';
import React from 'react';
import Link from './Link';

export default function BundleCSS() {
  const src = get(useAppState(), 'bundleCss');
  
  return src ?  <Link rel="stylesheet" href={src} /> : null;
}
