import React from 'react';
import Link from './Link';
import { useAppState } from '../context/app';
import { get } from '../util/get';

export default function BundleCSS() {
  const src = get(useAppState(), 'bundleCss');
  return <Link rel="stylesheet" href={src} />;
}
