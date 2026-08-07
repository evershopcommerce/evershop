import Area from '@components/common/Area.js';
import { AppProvider } from '@components/common/context/app.js';
import { Alert } from '@components/common/modal/Alert.js';
import React from 'react';
import { Client, Provider } from 'urql';

interface HydrateProps {
  client: Client;
}

export default function Hydrate({ client }: HydrateProps): React.ReactElement {
  return (
    <Provider value={client}>
      <AppProvider value={window.eContext}>
        <Alert>
          <Area id="body" className="wrapper" />
        </Alert>
      </AppProvider>
    </Provider>
  );
}
