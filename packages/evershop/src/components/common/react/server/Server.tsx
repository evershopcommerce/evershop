import Area from '@components/common/Area.js';
import { Alert } from '@components/common/modal/Alert.js';
import React from 'react';

interface ServerHtmlProps {
  css: string[];
  js: string[];
  appContext: string;
}
function ServerHtml({ css, js, appContext }: ServerHtmlProps) {
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

export default ServerHtml;
