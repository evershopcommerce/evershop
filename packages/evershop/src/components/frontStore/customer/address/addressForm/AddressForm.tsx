import Area from '@components/common/Area.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { NameAndTelephone } from '@components/frontStore/customer/address/addressForm/NameAndTelephone.js';
import { ProvinceAndPostcode } from '@components/frontStore/customer/address/addressForm/ProvinceAndPostcode.js';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { Address } from './Index.js';

interface CustomerAddressFormProps {
  allowCountries: {
    value: string;
    label: string;
    provinces: {
      value: string;
      label: string;
    }[];
  }[];
  address?: Address;
  areaId?: string;
  fieldNamePrefix?: string;
}
export function CustomerAddressForm({
  allowCountries,
  address = {},
  areaId = 'customerAddressForm',
  fieldNamePrefix = 'address'
}: CustomerAddressFormProps) {
  const { watch } = useFormContext();

  const getFieldName = (fieldName: string) => {
    return fieldNamePrefix ? `${fieldNamePrefix}.${fieldName}` : fieldName;
  };

  const selectedCountry = watch(
    getFieldName('country'),
    address?.country?.code || ''
  );
  return (
    <Area
      id={areaId}
      coreComponents={[
        {
          component: {
            default: (
              <NameAndTelephone
                fullName={address?.fullName}
                telephone={address?.telephone}
                getFieldName={getFieldName}
              />
            )
          },
          sortOrder: 10
        },
        {
          component: {
            default: (
              <InputField
                name={getFieldName('address_1')}
                label={_('Address')}
                placeholder={_('Address')}
                defaultValue={address?.address1}
                required
                validation={{
                  required: _('Address is required')
                }}
              />
            )
          },
          sortOrder: 20
        },
        {
          component: {
            default: (
              <InputField
                name={getFieldName('address_2')}
                label={_('Address 2')}
                placeholder={_('Address 2')}
                defaultValue={address?.address2}
              />
            )
          },
          sortOrder: 40
        },
        {
          component: {
            default: (
              <SelectField
                defaultValue={address?.country?.code || ''}
                label={_('Country')}
                name={getFieldName('country')}
                placeholder={_('Country')}
                required
                validation={{ required: _('Country is required') }}
                options={allowCountries}
              />
            )
          },
          sortOrder: 50
        },
        {
          component: {
            default: (
              <ProvinceAndPostcode
                provinces={
                  allowCountries.find(
                    (country) => country.value === selectedCountry
                  )?.provinces || []
                }
                province={address?.province}
                postcode={address?.postcode}
                getFieldName={getFieldName}
              />
            )
          },
          sortOrder: 60
        }
      ]}
    />
  );
}
