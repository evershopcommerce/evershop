import Area from '@components/common/Area';
import { App } from '@components/common/react/client/Client';
import { HotReload } from '@components/common/react/client/HotReload';
import { reportClientError } from '@components/common/react/client/reportClientError';
import React from 'react';
import { createRoot } from 'react-dom/client.js';
/** render */
createRoot(document.getElementById('app'), {
  onUncaughtError: (error, info) => reportClientError('uncaught', error, info),
  onRecoverableError: (error, info) => reportClientError('recoverable', error, info)
}).render(
  <App>
    <Area />
  </App>
);
