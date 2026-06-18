import Area from '@components/common/Area.js';
import { AppProvider } from '@components/common/context/app.js';
import { Alert } from '@components/common/modal/Alert.js';
import { PageBuilderBridge } from '@components/common/page-builder/index.js';
import Head from '@components/common/react/Head.js';
import React from 'react';
import { createClient, Provider } from 'urql';

declare global {
  interface Window {
    eContext: any;
  }
}

const client = createClient({
  url: window.eContext?.config?.pageMeta?.route?.isAdmin
    ? '/api/admin/graphql'
    : '/api/graphql'
  // Locale travels via the X-Locale header injected by the storefront fetch patch
  // (Server.tsx / fetchLocalePatch.ts) — urql uses window.fetch, so GraphQL is covered too.
});

interface AppProps {
  children: React.ReactNode;
}

export function App({ children }: AppProps) {
  return (
    <AppProvider value={window.eContext}>
      {/* PageBuilderBridge no-ops outside the page-builder iframe; safe to mount unconditionally. */}
      <PageBuilderBridge />
      <Provider value={client}>
        <Alert>
          <Head />
          <Area id="body" className="wrapper" />
        </Alert>
      </Provider>
      {children}
    </AppProvider>
  );
}
