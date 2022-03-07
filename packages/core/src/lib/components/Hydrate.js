import React from 'react';
import ReactDOM from 'react-dom';
import { Body } from './Body';

ReactDOM.hydrate(
  <Body />,
  document.getElementById('app')
);
