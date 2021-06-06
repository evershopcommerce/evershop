import React from 'react';
import Text from "../../../../../lib/components/form//fields/text";
import { ProvinceOptions } from "../../../../../lib/components/locale/province_option";
import Select from "../../../../../lib/components/form//fields/select";
import { CountryOptions } from "../../../../../lib/components/locale/country_option";
import Area from "../../../../../lib/components/area";
import { Form } from '../../../../../lib/components/form/form';
import { get } from '../../../../../lib/util/get';

function Province({ selectedCountry, selectedProvince }) {
    return <ProvinceOptions country={selectedCountry}>
        <Select
            value={selectedProvince}
            name="province"
            label={"Province"}
            validationRules={["notEmpty"]}
        />
    </ProvinceOptions>
}

function Country({ country, setCountry, countries = [] }) {

    const [selectedCountry, setSelectedCountry] = React.useState(() => {
        if (countries.length === 1)
            return countries[0];
        else
            return country;
    });

    React.useEffect(() => {
        if (countries.length === 1) {
            setSelectedCountry(countries[0]);
            setCountry(countries[0]);
        }
    }, []);

    const handler = (e) => {
        setCountry(e.target.value);
    };

    return <div style={{ display: countries.length > 1 ? 'block' : 'none' }}>
        <CountryOptions countries={countries}>
            <Select
                value={selectedCountry}
                label="Country"
                name="country"
                className="uk-form-small"
                handler={handler}
                validationRules={["notEmpty"]}
            />
        </CountryOptions>
    </div>
}

export default function AddressForm(props) {
    const [selectedCountry, setSelectedCountry] = React.useState(get(props, 'address.country'));
    const id = props.id !== undefined ? props.id : "customer_address_form";

    return <Form
        id={id}
        method={"POST"}
        onStart={props.onStart}
        onSuccess={props.onSuccess}
        onError={props.onError}
        action={props.action}>
        <Area
            id="customerAddressFormInner"
            coreWidgets={[
                {
                    'component': { default: Text },
                    'props': {
                        name: "full_name",
                        value: get(props, 'address.full_name', ''),
                        formId: id,
                        label: "Full name",
                        validationRules: ['notEmpty']
                    },
                    'sortOrder': 10,
                    'id': 'fullName'
                },
                {
                    'component': { default: Text },
                    'props': {
                        name: "telephone",
                        value: get(props, 'address.telephone', ''),
                        formId: id,
                        label: "Telephone",
                        validationRules: ['notEmpty']
                    },
                    'sortOrder': 30,
                    'id': 'telephone'
                },
                {
                    'component': { default: Text },
                    'props': {
                        name: "address_1",
                        value: get(props, 'address.address_1', ''),
                        formId: id,
                        label: "Address 1",
                        validationRules: ['notEmpty']
                    },
                    'sortOrder': 40,
                    'id': 'address1'
                },
                {
                    'component': { default: Text },
                    'props': {
                        name: "address_2",
                        value: get(props, 'address.address_2', ''),
                        formId: id,
                        label: "Address 2",
                        validationRules: []
                    },
                    'sortOrder': 50,
                    'id': 'address2'
                },
                {
                    'component': { default: Text },
                    'props': {
                        name: "postcode",
                        value: get(props, 'address.postcode', ''),
                        formId: id,
                        label: "Postcode",
                        validationRules: []
                    },
                    'sortOrder': 60,
                    'id': 'postcode'
                },
                {
                    'component': { default: Text },
                    'props': {
                        name: "city",
                        value: get(props, 'address.city', ''),
                        formId: id,
                        label: "City",
                        validationRules: []
                    },
                    'sortOrder': 70,
                    'id': 'city'
                },
                {
                    'component': { default: Country },
                    'props': {
                        country: get(props, 'address.country', ''),
                        countries: get(props, 'countries'),
                        setCountry: setSelectedCountry
                    },
                    'sortOrder': 80,
                    'id': 'country'
                },
                {
                    'component': { default: Province },
                    'props': {
                        selectedCountry: selectedCountry,
                        selectedProvince: get(props, 'address.province', '')
                    },
                    'sortOrder': 90,
                    'id': 'province'
                }
            ]}
        />
    </Form>
}