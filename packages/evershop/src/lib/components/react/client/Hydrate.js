import React from 'react';
import { createClient, Provider } from 'urql';
import { AppProvider } from '../../../context/app';
import { Alert } from '../../modal/Alert';
import Area from '../../Area';

const client = createClient({
  url: '/api/graphql'
});

export default function Hydrate() {
  return (
    <Provider value={client}>
      <AppProvider value={window.eContext}>
        <Alert>
          <Area id="body" className="wrapper" />
        </Alert>
      </AppProvider>
    </Provider>
  );
}
