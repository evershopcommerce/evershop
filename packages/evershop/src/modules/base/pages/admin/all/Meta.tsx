import { Meta, MetaRobots } from '@components/common/Meta.js';
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
      {/* The admin panel must never be indexed (spec §6.17). */}
      <MetaRobots index={false} follow={false} />
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
