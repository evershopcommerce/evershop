import React from "react";
import { AppProvider } from '../../../context/app';
import Area from '../../Area';
import Head from '../Head';
import { createClient, Provider } from 'urql';
import { Alert } from '../../modal/Alert';

const client = createClient({
  url: '/v1/graphql'
});

export const App = ({ children }) => <AppProvider value={window.eContext}>
  <Provider value={client}>
    <Alert>
      <Head />
      <Area id="body" className="wrapper" />
    </Alert>
  </Provider>
  {children}
</AppProvider>