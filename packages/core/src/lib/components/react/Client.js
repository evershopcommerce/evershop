import React from 'react';
import { AppProvider } from '../../context/app';
import Area from '../Area';
import { Alert } from '../modal/Alert';
import Head from './Head';

export const App = () => <AppProvider value={window.eContext}>
  <Alert>
    <Head />
    <Area id="body" className="wrapper" />
  </Alert>
</AppProvider>