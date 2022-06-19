/* eslint-disable react/no-danger */
import PropTypes from 'prop-types';
import React from 'react';
import Area from './Area';
import { getComponents } from './getComponents';
import { Alert } from './modal/Alert';

function Html({ bundle, appContext }) {
  return (
    <>
      <head>
        <Area noOuter id="head" components={getComponents()} />
        <script dangerouslySetInnerHTML={{ __html: appContext }} />
      </head>
      <body id="body">
        <Alert>
          <div id="app" className="bg-background">
            <Area id="body" className="wrapper" components={getComponents()} />
          </div>
        </Alert>
      </body>
      <script src={bundle} />
    </>
  );
}

Html.propTypes = {
  bundle: PropTypes.string.isRequired,
  appContext: PropTypes.string.isRequired
};

export default Html;
