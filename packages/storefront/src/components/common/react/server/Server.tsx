import Area from '@components/common/Area.js';
import { Alert } from '@components/common/modal/Alert.js';
import React from 'react';
import { Route } from '../../../../types/route.js';

interface ServerHtmlProps {
  route: Route;
  css: string[];
  js: string[];
  appContext: string;
}
function ServerHtml({ route, css, js, appContext }: ServerHtmlProps) {
  const classes = route.isAdmin
    ? `admin ${route.id}`
    : `frontStore ${route.id}`;
  return (
    <>
      <head>
        <meta charSet="utf-8" />
        <script dangerouslySetInnerHTML={{ __html: appContext }} />
        {css.map((source, index) => (
          <style key={index} dangerouslySetInnerHTML={{ __html: source }} />
        ))}
        <Area noOuter id="head" />
      </head>
      <body id="body" className={classes}>
        <div id="app">
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

export default ServerHtml;
