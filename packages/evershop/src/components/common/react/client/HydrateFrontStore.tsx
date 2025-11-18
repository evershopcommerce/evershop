import React from 'react';
import { createClient } from 'urql';
import Hydrate from './Hydrate.js';

const client = createClient({
  url: '/api/graphql'
});

export function HydrateFrontStore() {
  return <Hydrate client={client} />;
}
