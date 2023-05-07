import React from 'react';
import { createClient } from 'urql';
import Hydrate from './Hydrate';

const client = createClient({
  url: '/api/admin/graphql'
});

export default function HydrateAdmin() {
  return <Hydrate client={client} />;
}
