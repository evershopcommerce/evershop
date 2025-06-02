import Area from '@components/common/Area';
import React from 'react';

export default function CustomerEditForm() {
  return (
    <div className="grid grid-cols-3 gap-x-8 grid-flow-row ">
      <div className="col-span-2 grid grid-cols-1 gap-8 auto-rows-max">
        <Area id="leftSide" noOuter />
      </div>
      <div className="col-span-1 grid grid-cols-1 gap-8 auto-rows-max">
        <Area id="rightSide" noOuter />
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    gridUrl: url(routeId: "customerGrid")
  }
`;
