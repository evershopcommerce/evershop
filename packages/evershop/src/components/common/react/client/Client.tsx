import Area from '@components/common/Area.js';
import { AppProvider } from '@components/common/context/app.js';
import { Alert } from '@components/common/modal/Alert.js';
import Head from '@components/common/react/Head.js';
import React from 'react';
import { createClient, Provider } from 'urql';

declare global {
  interface Window {
    eContext: any;
  }
}

const client = createClient({
  url: '/api/graphql'
});

interface AppProps {
  children: React.ReactNode;
}

export function App({ children }: AppProps) {
  return (
    <AppProvider value={window.eContext}>
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
