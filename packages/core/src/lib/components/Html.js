/* eslint-disable react/no-danger */
import PropTypes from 'prop-types';
import React from 'react';
import Area from './Area';
import { getComponents } from './getComponents';
import { Alert } from './modal/Alert';

function Html({ bundle, appContext, route }) {
  return (
    <>
      <head>
        <Area noOuter id="head" components={getComponents(route)} />
        <script dangerouslySetInnerHTML={{ __html: appContext }} />
      </head>
      <body id="body">
        <Alert>
          <div id="app" className="bg-background">
            <Area id="body" className="wrapper" components={getComponents(route)} />
          </div>
        </Alert>
      </body>
      <script src={bundle} />
    </>
  );
}

Html.propTypes = {
  bundle: PropTypes.string.isRequired,
  appContext: PropTypes.string.isRequired,
  route: PropTypes.shape({
    isAdmin: PropTypes.bool,
    id: PropTypes.string
  }).isRequired
};

export default Html;
