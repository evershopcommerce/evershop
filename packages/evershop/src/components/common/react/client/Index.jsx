import Area from '@components/common/Area';
import { App } from '@components/common/react/client/Client';
import { HotReload } from '@components/common/react/client/HotReload';
import React from 'react';
import ReactDOM from 'react-dom';
/** render */
ReactDOM.render(
  <App>
    <Area />
  </App>,
  document.getElementById('app')
);
