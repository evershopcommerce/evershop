import React from 'react';
import ReactDOM from 'react-dom';
import Html from './Html';
import { AppProvider } from '../context/app';
import { Alert } from './modal/Alert';

ReactDOM.hydrate(
  <AppProvider value={window.appContext}>
    <Alert>
      <Html />
    </Alert>
  </AppProvider>,
  document.getElementById('root')
);
