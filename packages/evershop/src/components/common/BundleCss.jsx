import { useAppState } from '@components/common/context/app';
import React from 'react';
import { get } from '../../lib/util/get.js';
import Link from './Link';

export default function BundleCSS() {
  const src = get(useAppState(), 'bundleCss');
  if (!src) {
    return null;
  } else {
    return <Link rel="stylesheet" href={src} />;
  }
}
