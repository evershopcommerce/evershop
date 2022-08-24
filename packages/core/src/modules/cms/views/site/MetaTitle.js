import React from 'react';
import Title from '../../../../lib/components/Title';
import { get } from '../../../../lib/util/get';
import { useAppState } from '../../../../lib/context/app';

export default function MetaTitle() {
  const title = get(useAppState(), 'metaTitle');

  return <Title title={title} />;
}
