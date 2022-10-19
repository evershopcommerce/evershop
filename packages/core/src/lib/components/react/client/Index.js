import React from 'react';
import ReactDOM from 'react-dom';
import Area from '@evershop/core/src/lib/components/Area';
import { App } from '@evershop/core/src/lib/components/react/client/Client';
const hot = require('webpack-hot-middleware/client?path=/eHot&reload=true&overlay=true');
import { HotReload } from '@evershop/core/src/lib/components/react/client/HotReload';
/**render*/
ReactDOM.render(<App><HotReload hot={hot} /></App>, document.getElementById('app'));
if (module.hot) {
  module.hot.accept();
}
