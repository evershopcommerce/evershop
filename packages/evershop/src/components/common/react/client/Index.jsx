import Area from '@components/common/Area';
import { App } from '@components/common/react/client/Client';
import { HotReload } from '@components/common/react/client/HotReload';
import React from 'react';
import ReactDOM from 'react-dom';
import hot from 'webpack-hot-middleware/client?path=/eHot&reload=true&overlay=true';
/** render */
ReactDOM.render(
  <App>
    <Area />
    <HotReload hot={hot} />
  </App>,
  document.getElementById('app')
);
