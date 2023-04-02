import React from 'react';
import { createClient, Provider } from 'urql';
import { AppProvider } from '@components/common/context/app';
import { Alert } from '@components/common/modal/Alert';
import Area from '@components/common/Area';

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
