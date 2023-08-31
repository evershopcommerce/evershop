import React from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'urql';
import { AppProvider } from '@components/common/context/app';
import { Alert } from '@components/common/modal/Alert';
import Area from '@components/common/Area';

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
