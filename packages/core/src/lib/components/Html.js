/* eslint-disable react/no-danger */
import PropTypes from 'prop-types';
import React from 'react';
import Area from './Area';
import { Body } from './Body';
import { getComponents } from './getComponents';

function Html({ bundle }) {
  return (
    <>
      <head>
        <Area noOuter id="head" components={getComponents()} />
      </head>
      <body id="body">
        <Body />
      </body>
      <script dangerouslySetInnerHTML={{ __html: bundle }} />
    </>
  );
}

Html.propTypes = {
  bundle: PropTypes.string.isRequired
};

export default Html;
