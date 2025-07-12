import React from 'react';

export default function EveryWhere() {
  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 rounded-lg shadow-md mt-10">
      <h1 className="font-bold text-center mb-6">Everywhere</h1>
      <p className="text-gray-700 text-center">
        This component is rendered on every page of the store front.
      </p>
      <p className="text-gray-700 text-center">
        You can modify this component at{' '}
        <code>`themes/sample/src/pages/all/EveryWhere.tsx`</code>
      </p>
      <p className=" text-gray-700 text-center">
        You can also remove this by disabling the theme `sample`.
      </p>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};
