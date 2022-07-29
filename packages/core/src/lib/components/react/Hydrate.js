import React from 'react';
import ReactDOM from 'react-dom';
import { AppProvider } from '../../context/app';
import Area from './Area';
import { Alert } from './modal/Alert';

ReactDOM.hydrate(
  <AppProvider value={window.appContext}>
    <Alert>
      <Area id="body" className="wrapper" />
    </Alert>
  </AppProvider>,
  document.getElementById('app')
);