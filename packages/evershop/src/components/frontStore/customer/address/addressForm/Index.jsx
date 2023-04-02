import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import { CustomerAddressForm } from '@components/frontStore/customer/address/addressForm/AddressForm';
import { AddressFormLoadingSkeleton } from '@components/frontStore/customer/address/addressForm/AddressFormLoadingSkeleton';

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

export default function Index({
  address = {},
  formId = 'customerAddressForm',
  areaId = 'customerAddressForm'
}) {
  const [result] = useQuery({
    query: CountriesQuery
  });

  const { data, fetching, error } = result;

  if (fetching) return <AddressFormLoadingSkeleton />;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <CustomerAddressForm
      address={address}
      formId={formId}
      areaId={areaId}
      allowCountries={data.allowedCountries}
    />
  );
}

Index.propTypes = {
  address: PropTypes.shape({
    address1: PropTypes.string,
    city: PropTypes.string,
    country: PropTypes.shape({
      code: PropTypes.string
    }),
    fullName: PropTypes.string,
    postcode: PropTypes.string,
    province: PropTypes.shape({
      code: PropTypes.string
    }),
    telephone: PropTypes.string
  }),
  areaId: PropTypes.string,
  formId: PropTypes.string
};

Index.defaultProps = {
  address: {},
  areaId: 'customerAddressForm',
  formId: 'customerAddressForm'
};
