import React from 'react';
import { createClient } from 'urql';
import Hydrate from './Hydrate.js';

const client = createClient({
  url: '/api/admin/graphql'
});

export function HydrateAdmin() {
  return <Hydrate client={client} />;
}
