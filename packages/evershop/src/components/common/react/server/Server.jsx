import Area from '@components/common/Area';
import { Alert } from '@components/common/modal/Alert';
import PropTypes from 'prop-types';
import React from 'react';

function ServerHtml({ css, js, appContext }) {
  return (
    <>
      <head>
        <meta charset="utf-8" />
        <script dangerouslySetInnerHTML={{ __html: appContext }} />
        {css.map((src, index) => (
          <link href={src} rel="stylesheet" key={index} />
        ))}
        <Area noOuter id="head" />
      </head>
      <body id="body">
        <div id="app" className="bg-background">
          <Alert>
            <Area id="body" className="wrapper" />
          </Alert>
        </div>
        {js.map((src, index) => (
          <script src={src} key={index} />
        ))}
      </body>
    </>
  );
}

ServerHtml.propTypes = {
  css: PropTypes.arrayOf(PropTypes.string).isRequired,
  js: PropTypes.arrayOf(PropTypes.string).isRequired,
  appContext: PropTypes.string.isRequired
};

export default ServerHtml;
