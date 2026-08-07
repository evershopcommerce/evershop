/* eslint-disable react/prop-types */
import Area from '@components/common/Area';
import React from 'react';

export function AddressSummary({ address }) {
  return (
    <Area
      id="addressSummary"
      className="address__summary"
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
                <div>
                  {province && <span>{province.name}, </span>}{' '}
                  <span>{country.name}</span>
                </div>
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
