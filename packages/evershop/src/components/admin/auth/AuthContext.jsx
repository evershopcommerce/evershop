import Area from '@components/common/Area';
import { useAppState } from '@components/common/context/app';
import React from 'react';
import { createClient, Provider } from 'urql';
import { get } from '../../../lib/util/get.js';

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

export const useToken = () => React.useContext(AuthContext);
