import React from 'react';
import PageHeading from '@components/admin/cms/PageHeading';

export default function Heading() {
  return <div className='w-2/3' style={{margin: '0 auto'}}>
    <PageHeading backUrl={null} heading="Collections" />
  </div>;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
