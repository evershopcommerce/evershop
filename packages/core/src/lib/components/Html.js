import React from 'react';
import Area from './Area';

function Html() {
  return (
    <>
      <head>
        <Area noOuter id="head" />
      </head>
      <body>
        <div id="app" className="bg-background">
          <Area id="body" className="wrapper" />
        </div>
        <Area id="after.body" noOuter />
      </body>
    </>
  );
}

export default Html;
