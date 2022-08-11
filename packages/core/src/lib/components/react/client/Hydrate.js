import React from 'react';
import { AppProvider } from '../../../context/app';
import { store } from '@evershop/core/src/lib/components/redux/store';
import { Provider } from 'react-redux';
import { Alert } from '../../modal/Alert';
import Area from '../../Area';

export default function Hydrate() {
  return <Provider store={store}>
    <AppProvider value={window.eContext}>
      <Alert>
        <Area id="body" className="wrapper" />
      </Alert>
    </AppProvider>
  </Provider>
};
