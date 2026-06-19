import { CustomerAddressForm } from '@components/frontStore/customer/address/addressForm/AddressForm.js';
import { AddressFormLoadingSkeleton } from '@components/frontStore/customer/address/addressForm/AddressFormLoadingSkeleton.js';
import { CustomerAddressGraphql } from '@evershop/evershop/types/customerAddress';
import React from 'react';
import { useQuery } from 'urql';

const AllowedCountriesQuery = `
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

const AllCountriesQuery = `
  query Country {
    countries {
      value: code
      label: name
      provinces {
        label: name
        value: code
      }
    }
  }
`;

interface IndexProps {
  address?: CustomerAddressGraphql;
  areaId?: string;
  fieldNamePrefix?: string;
  countryScope?: 'allowed' | 'all';
}

export default function Index({
  address = {},
  areaId = 'customerAddressForm',
  fieldNamePrefix = 'address',
  countryScope = 'allowed'
}: IndexProps) {
  const [result] = useQuery({
    query: countryScope === 'all' ? AllCountriesQuery : AllowedCountriesQuery
  });

  const { data, fetching, error } = result;

  if (fetching) return <AddressFormLoadingSkeleton />;
  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }

  const countries =
    countryScope === 'all'
      ? data?.countries || []
      : data?.allowedCountries || [];

  return (
    <CustomerAddressForm
      address={address}
      areaId={areaId}
      allowCountries={countries}
      fieldNamePrefix={fieldNamePrefix}
    />
  );
}
