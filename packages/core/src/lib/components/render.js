import React from 'react';
import { inspect } from 'util';
import Html from './Html';
import { Alert } from './modal/Alert';
import { AppProvider } from '../context/app';

const { renderToString } = require('react-dom/server');

export function renderHtml(bundleJs, contextData) {
  const source = renderToString(
    <AppProvider value={contextData}>
      <Alert>
        <Html
          bundle={bundleJs}
          appContext={`var appContext = ${inspect(contextData, { depth: 10, maxArrayLength: null })}`}
        />
      </Alert>
    </AppProvider>
  );

  return `<!DOCTYPE html><html id="root">${source}</html>`;
}