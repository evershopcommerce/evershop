import { AppProvider } from '@components/common/context/app.js';
import ServerHtml from '@components/common/react/server/Server.js';
import React from 'react';
import { renderToString } from 'react-dom/server.js';
import { setSSRContext } from '../../../../lib/locale/activeDictionary.js';

function renderHtml(route, js, css, contextData, langCode) {
  const eContext = JSON.parse(contextData);
  // SSR bridge (spec §6.7). This MUST live here, not in `render.ts`: this file is
  // compiled into the route's webpack *server bundle*, so it shares the bundle's own
  // `activeDictionary` instance — the same one the bundled `_()` reads. `render.ts`
  // runs in the main process (a different module instance), so a bridge there never
  // reaches the bundled `_()`. Safe because `renderToString` is synchronous.
  setSSRContext(
    {
      locale: eContext.locale ?? '',
      defaultLocale: eContext.defaultLocale ?? '',
      isAdmin: route.isAdmin === true
    },
    eContext.translations ?? {}
  );
  try {
    const source = renderToString(
      <AppProvider value={eContext}>
        <ServerHtml
          route={route}
          js={js}
          css={css}
          appContext={`var eContext = ${contextData}`}
        />
      </AppProvider>
    );

    return `<!DOCTYPE html><html id="root" lang="${langCode}">${source}</html>`;
  } finally {
    setSSRContext({ locale: '', defaultLocale: '', isAdmin: false }, {});
  }
}

export { renderHtml };
