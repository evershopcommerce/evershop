/* eslint-disable react/prop-types */
/* eslint-disable camelcase */
/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import Area from '../../../../../lib/components/Area';
import { getComponents } from '../../../../../lib/components/getComponents';

export function AddressSummary({ address }) {
  return (
    <Area
      id="addressSummary"
      className="address-summary"
      components={getComponents()}
      coreComponents={[
        {
          component: { default: ({ full_name }) => <div className="full-name">{full_name}</div> },
          props: {
            full_name: address.full_name
          },
          sortOrder: 10,
          id: 'fullName'
        },
        {
          component: { default: ({ address_1 }) => <div className="address-one">{address_1}</div> },
          props: {
            address_1: address.address_1
          },
          sortOrder: 20,
          id: 'address1'
        },
        {
          component: {
            default: ({
              city, province, postcode, country
            }) => (
              <div className="city-province-postcode">
                {city}
                ,
                {' '}
                {province}
                ,
                {' '}
                {postcode}
                ,
                {' '}
                {country}
              </div>
            )
          },
          props: {
            city: address.city,
            province: address.province,
            postcode: address.postcode
          },
          sortOrder: 40,
          id: 'cityProvincePostcode'
        },
        {
          component: { default: ({ telephone }) => <div className="telephone">{telephone}</div> },
          props: {
            telephone: address.telephone
          },
          sortOrder: 60,
          id: 'telephone'
        }
      ]}
    />
  );
}
