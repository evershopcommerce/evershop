import { CustomerAddressForm } from '@components/frontStore/customer/address/addressForm/AddressForm.js';
import { AddressFormLoadingSkeleton } from '@components/frontStore/customer/address/addressForm/AddressFormLoadingSkeleton.js';
import React from 'react';
import { useQuery } from 'urql';

const CountriesQuery = `
  query Country {
    allowedCountries  {
      value: code
      label: name
      provinces {
        label: name
        value: code
      }
    }
  }
`;

export interface Address {
  id?: number;
  address1?: string;
  address2?: string;
  city?: string;
  country?: {
    code: string;
  };
  fullName?: string;
  postcode?: string;
  province?: {
    code: string;
  };
  telephone?: string;
}

interface IndexProps {
  address?: Address;
  areaId?: string;
  fieldNamePrefix?: string;
}

export default function Index({
  address = {},
  areaId = 'customerAddressForm',
  fieldNamePrefix = 'address'
}: IndexProps) {
  const [result] = useQuery({
    query: CountriesQuery
  });

  const { data, fetching, error } = result;

  if (fetching) return <AddressFormLoadingSkeleton />;
  if (error) {
    return <p className="text-critical">{error.message}</p>;
  }

  return (
    <CustomerAddressForm
      address={address}
      areaId={areaId}
      allowCountries={data.allowedCountries}
      fieldNamePrefix={fieldNamePrefix}
    />
  );
}
