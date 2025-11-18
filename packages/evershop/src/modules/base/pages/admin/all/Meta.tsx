import { Meta } from '@components/common/Meta.js';
import { Title } from '@components/common/Title.js';
import React from 'react';

interface SeoMetaProps {
  pageInfo: {
    title: string;
    description: string;
  };
}

export default function SeoMeta({
  pageInfo: { title, description }
}: SeoMetaProps) {
  return (
    <>
      <Title title={title} />
      <Meta name="description" content={description} />
    </>
  );
}

export const layout = {
  areaId: 'head',
  sortOrder: 5
};

export const query = `
  query query {
    pageInfo {
      title
      description
    }
  }
`;
