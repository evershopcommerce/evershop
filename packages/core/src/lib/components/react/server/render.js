import React from 'react';
import { inspect } from 'util';
import ServerHtml from './Server';
import { AppProvider } from '../../../context/app';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { createStoreSSR } from '../../redux/storeSSR';

export function renderHtml(js, css, contextData) {
  const store = createStoreSSR(contextData)
  const source = renderToString(
    <Provider store={store}>
      <AppProvider value={contextData}>
        <ServerHtml
          js={js}
          css={css}
          appContext={`var eContext = ${inspect(contextData, { depth: 10, maxArrayLength: null })}`}
        />
      </AppProvider>
    </Provider>
  );

  return `<!DOCTYPE html><html id="root">${source}</html>`;
}