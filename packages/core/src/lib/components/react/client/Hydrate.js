import React from 'react';
import { AppProvider } from '../../../context/app';
import { Alert } from '../../modal/Alert';
import Area from '../../Area';

export default function Hydrate() {
  return <AppProvider value={window.eContext}>
    <Alert>
      <Area id="body" className="wrapper" />
    </Alert>
  </AppProvider>
};
