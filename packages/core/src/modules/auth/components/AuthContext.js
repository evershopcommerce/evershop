import PropTypes from 'prop-types'
import React from 'react';
import { createClient, Provider } from 'urql';
import Area from "../../../lib/components/Area";
import { useAppState } from "../../../lib/context/app";
import { get } from "../../../lib/util/get";

const AuthContext = React.createContext();

export function AuthProvider() {
  const context = useAppState();
  const token = get(context, 'token');

  const client = createClient({
    url: '/v1/graphql'
  });

  return (
    <AuthContext.Provider token={token}>
      <Provider value={client}>
        <Area id="body" />
      </Provider>
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
};

export const useToken = () => React.useContext(AuthContext);
