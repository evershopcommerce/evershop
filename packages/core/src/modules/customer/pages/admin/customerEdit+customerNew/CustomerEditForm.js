import PropTypes from 'prop-types';
import React from 'react';
import Area from '../../../../../lib/components/Area';

export default function CustomerEditForm({ gridUrl }) {
  return (
    <div className="grid grid-cols-3 gap-x-2 grid-flow-row ">
      <div className="col-span-2 grid grid-cols-1 gap-2 auto-rows-max">
        <Area id="leftSide" noOuter />
      </div>
      <div className="col-span-1 grid grid-cols-1 gap-2 auto-rows-max">
        <Area id="rightSide" noOuter />
      </div>
    </div>
  );
}

CustomerEditForm.propTypes = {
  gridUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    gridUrl: url(routeId: "customerGrid")
  }
`;