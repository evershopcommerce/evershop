import React from 'react';
import Area from './Area';
import { getComponents } from './getComponents';

export function Body() {
  return (
    <div id="app" className="bg-background">
      <Area id="body" className="wrapper" components={getComponents()} />
    </div>
  );
}
