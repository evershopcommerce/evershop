import React from 'react';
import ReactDOM from 'react-dom';
import { AppProvider } from '../context/app';
import Area from './Area';
import { getComponents } from './getComponents';
import { Alert } from './modal/Alert';

ReactDOM.hydrate(
  <AppProvider value={window.appContext}>
    <Alert>
      <Area id="body" className="wrapper" components={getComponents()} />
    </Alert>
  </AppProvider>,
  document.getElementById('app')
);
