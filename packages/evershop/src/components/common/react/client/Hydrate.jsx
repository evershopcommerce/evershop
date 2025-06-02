import Area from '@components/common/Area';
import { AppProvider } from '@components/common/context/app';
import { Alert } from '@components/common/modal/Alert';
import PropTypes from 'prop-types';
import React from 'react';
import { Provider } from 'urql';

export default function Hydrate({ client }) {
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

Hydrate.propTypes = {
  client: PropTypes.shape({
    executeQuery: PropTypes.func.isRequired,
    executeMutation: PropTypes.func.isRequired
  }).isRequired
};
