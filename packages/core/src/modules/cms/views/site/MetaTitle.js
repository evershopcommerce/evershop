import React from 'react';
import Title from '../../../../lib/components/Title';
import { useSelector } from 'react-redux';
import { get } from '../../../../lib/util/get';

export default function MetaTitle() {
  const title = useSelector((state) => state.pageData.metaTitle)

  return <Title title={title} />;
}
