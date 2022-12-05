import React from 'react';
import { CustomerAddressForm } from './AddressForm';
import { AddressFormLoadingSkeleton } from './AddressFormLoadingSkeleton';
import { useQuery } from 'urql';

const CountriesQuery = `
  query Country {
    allowedCountries  {
      code
      name
      provinces {
        name
        code
      }
    }
  }
`;

export default function Index({ address = {}, formId = 'customerAddressForm', areaId = 'customerAddressForm' }) {
  const [result, reexecuteQuery] = useQuery({
    query: CountriesQuery
  });

  const { data, fetching, error } = result;

  if (fetching) return <AddressFormLoadingSkeleton />;
  if (error) return <p>Oh no... {error.message}</p>;

  return <CustomerAddressForm
    address={address}
    formId={formId}
    areaId={areaId}
    allowCountries={data.allowedCountries}
  />
}