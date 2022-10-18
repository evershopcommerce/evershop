import React from 'react';
import { AppProvider } from '../../../context/app';
import { Alert } from '../../modal/Alert';
import Area from '../../Area';
import { createClient, Provider } from 'urql';

const client = createClient({
  url: '/v1/graphql'
});

export default function Hydrate() {
  return <Provider value={client}>
    <AppProvider value={window.eContext}>
      <Alert>
        <Area id="body" className="wrapper" />
      </Alert>
    </AppProvider>
  </Provider>
};
