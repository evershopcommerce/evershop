import React from "react";
import Area from "../../../../../lib/components/area";

export function AddressSummary({ address }) {
    return <Area
        id={"addressSummary"}
        className={"address-summary"}
        coreWidgets={[
            {
                component: { default: ({ full_name }) => <div className="full-name">{full_name}</div> },
                props: {
                    full_name: address.full_name
                },
                sortOrder: 10,
                id: "fullName"
            },
            {
                component: { default: ({ address_1 }) => <div className="address-one">{address_1}</div> },
                props: {
                    address_1: address.address_1
                },
                sortOrder: 20,
                id: "address1"
            },
            {
                component: { default: ({ address_2 }) => <div className="address-two">{address_2}</div> },
                props: {
                    address_2: address.address_2
                },
                sortOrder: 30,
                id: "address2"
            },
            {
                component: { default: ({ city }) => <div className="city">{city}</div> },
                props: {
                    city: address.city
                },
                sortOrder: 30,
                id: "city"
            },
            {
                component: { default: ({ city, province, postcode }) => <div className="city-province-postcode">{city}, {province}, {postcode}</div> },
                props: {
                    city: address.city,
                    province: address.province,
                    postcode: address.postcode
                },
                sortOrder: 40,
                id: "cityProvincePostcode"
            },
            {
                component: { default: ({ country }) => <div className="country">{country}</div> },
                props: {
                    country: address.country
                },
                sortOrder: 50,
                id: "country"
            },
            {
                component: { default: ({ telephone }) => <div className="telephone">{telephone}</div> },
                props: {
                    telephone: address.telephone
                },
                sortOrder: 60,
                id: "telephone"
            }
        ]}
    />;
}