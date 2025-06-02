import React from 'react';

function Content() {
  return (
    <div className="page-width p-2">
      <div className="text-center p-2">
        <h3>Sorry!</h3>
        <p>You are not old enough to view this site. Sorry!</p>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 1
};

export default Content;
