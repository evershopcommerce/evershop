import React from 'react';
import Title from '@components/common/Title';
import { get } from '../../../lib/util/get.js';
import { useAppState } from '@components/common/context/app';

export default function MetaTitle() {
  const title = get(useAppState(), 'metaTitle');

  return <Title title={title} />;
}
