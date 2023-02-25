/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';
import Area from '@components/common/Area';
import { Country } from '@components/frontStore/customer/address/addressForm/Country';
import { ProvinceAndPostcode } from '@components/frontStore/customer/address/addressForm/ProvinceAndPostcode';
import { NameAndTelephone } from '@components/frontStore/customer/address/addressForm/NameAndTelephone';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export function CustomerAddressForm({
  allowCountries,
  address = {},
  formId = 'customerAddressForm',
  areaId = 'customerAddressForm'
}) {
  const [selectedCountry, setSelectedCountry] = React.useState(() => {
    const country = address?.country?.code;
    if (!country || !allowCountries.find((c) => c.code === country)) {
      return null;
    } else {
      return country;
    }
  });

  return (
    <Area
      id={areaId}
      coreComponents={[
        {
          component: { default: NameAndTelephone },
          props: {
            address
          },
          sortOrder: 10
        },
        {
          component: { default: Field },
          props: {
            type: 'text',
            name: 'address[address_1]',
            value: address?.address1,
            formId,
            label: _('Address'),
            placeholder: _('Address'),
            validationRules: ['notEmpty']
          },
          sortOrder: 20
        },
        {
          component: { default: Field },
          props: {
            type: 'text',
            name: 'address[city]',
            value: address?.city,
            label: _('City'),
            placeholder: _('City'),
            validationRules: []
          },
          sortOrder: 40
        },
        {
          component: { default: Country },
          props: {
            selectedCountry,
            allowCountries,
            setSelectedCountry,
            fieldName: 'address[country]'
          },
          sortOrder: 50
        },
        {
          component: { default: ProvinceAndPostcode },
          props: {
            address,
            allowCountries,
            selectedCountry
          },
          sortOrder: 60
        }
      ]}
    />
  );
}

CustomerAddressForm.propTypes = {
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
  allowCountries: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string,
      name: PropTypes.string,
      provinces: PropTypes.arrayOf(
        PropTypes.shape({
          code: PropTypes.string,
          name: PropTypes.string
        })
      )
    })
  ).isRequired,
  areaId: PropTypes.string,
  formId: PropTypes.string
};

CustomerAddressForm.defaultProps = {
  address: {},
  areaId: 'customerAddressForm',
  formId: 'customerAddressForm'
};
