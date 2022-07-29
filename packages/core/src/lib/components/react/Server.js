/* eslint-disable react/no-danger */
import PropTypes from 'prop-types';
import React from 'react';
import Area from '../Area';
import { Alert } from '../modal/Alert';

function Html({ bundle, appContext }) {
  return (
    <>
      <head>
        <Area noOuter id="head" />
        <script dangerouslySetInnerHTML={{ __html: appContext }} />
      </head>
      <body id="body">
        <Alert>
          <div id="app" className="bg-background">
            <Area id="body" className="wrapper" />
          </div>
        </Alert>
      </body>
      {bundle.map((script, key) => {
        return (
          <script
            key={key}
            src={'/assets/' + script}
            type="text/javascript"
            charSet="utf-8"
          />
        );
      })}
    </>
  );
}

Html.propTypes = {
  bundle: PropTypes.string.isRequired,
  appContext: PropTypes.string.isRequired
};

export default Html;
