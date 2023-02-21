/* eslint-disable react/prop-types */
/* eslint-disable camelcase */
/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import Area from '@components/common/Area';

export function AddressSummary({ address }) {
  return (
    <Area
      id="addressSummary"
      className="address-summary"
      coreComponents={[
        {
          component: {
            default: ({ fullName }) => (
              <div className="full-name">{fullName}</div>
            )
          },
          props: {
            fullName: address.fullName
          },
          sortOrder: 10,
          id: 'fullName'
        },
        {
          component: {
            default: ({ address1 }) => (
              <div className="address-one">{address1}</div>
            )
          },
          props: {
            address1: address.address1
          },
          sortOrder: 20,
          id: 'address1'
        },
        {
          component: {
            default: ({ city, province, postcode, country }) => (
              <div className="city-province-postcode">
                <div>{`${postcode}, ${city}`}</div>
                <div>{`${province.name}, ${country.name}`}</div>
              </div>
            )
          },
          props: {
            city: address.city,
            province: address.province,
            postcode: address.postcode,
            country: address.country
          },
          sortOrder: 40,
          id: 'cityProvincePostcode'
        },
        {
          component: {
            default: ({ telephone }) => (
              <div className="telephone">{telephone}</div>
            )
          },
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
