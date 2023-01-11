import React from 'react';
import { createClient, Provider } from 'urql';
import { AppProvider } from '../../../context/app';
import Area from '../../Area';
import Head from '../Head';
import { Alert } from '../../modal/Alert';

const client = createClient({
  url: '/api/graphql'
});

export function App({ children }) {
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
