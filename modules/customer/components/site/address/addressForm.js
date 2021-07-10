import React from 'react';
import Text from "../../../../../lib/components/form/fields/text";
import { ProvinceOptions } from "../../../../../lib/components/locale/province_option";
import Select from "../../../../../lib/components/form/fields/select";
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

const NameAndTelephone = ({ formId, address }) => {
    return <div className="row">
        <div className="col">
            <Text
                name="full_name"
                value={get(address, 'full_name', '')}
                formId={formId}
                label="Full name"
                validationRules={['notEmpty']}
            />
        </div>
        <div className="col">
            <Text
                name="telephone"
                value={get(address, 'telephone', '')}
                formId={formId}
                label="Telephone"
                validationRules={['notEmpty']}
            />
        </div>
    </div>
}

const ProvinceAndPostcode = ({ formId, address, selectedCountry, selectedProvince }) => {
    return <div className="row">
        <div className="col">
            <Province
                selectedCountry={selectedCountry}
                selectedProvince={selectedProvince}
            />
        </div>
        <div className="col">
            <Text
                name="postcode"
                value={get(address, 'postcode', '')}
                formId={formId}
                label="Postcode"
                validationRules={['notEmpty']}
            />
        </div>
    </div>
}

export function CustomerAddressForm(props) {
    const [selectedCountry, setSelectedCountry] = React.useState(get(props, 'address.country'));
    const formId = props.formId || "customer_address_form";
    const areaId = props.areaId || "customerAddressForm";

    return <Form
        {...props}
        id={formId}
    >
        <Area
            id={areaId}
            coreComponents={[
                {
                    'component': { default: NameAndTelephone },
                    'props': {
                        formId: formId,
                        address: get(props, 'address', {})
                    },
                    'sortOrder': 10,
                    'id': 'fullName'
                },
                {
                    'component': { default: Text },
                    'props': {
                        name: "address_1",
                        value: get(props, 'address.address_1', ''),
                        formId: formId,
                        label: "Address 1",
                        validationRules: ['notEmpty']
                    },
                    'sortOrder': 20,
                    'id': 'address1'
                },
                {
                    'component': { default: Text },
                    'props': {
                        name: "address_2",
                        value: get(props, 'address.address_2', ''),
                        formId: formId,
                        label: "Address 2",
                        validationRules: []
                    },
                    'sortOrder': 30,
                    'id': 'address2'
                },
                {
                    'component': { default: Text },
                    'props': {
                        name: "city",
                        value: get(props, 'address.city', ''),
                        formId: formId,
                        label: "City",
                        validationRules: []
                    },
                    'sortOrder': 40,
                    'id': 'city'
                },
                {
                    'component': { default: Country },
                    'props': {
                        country: get(props, 'address.country', ''),
                        countries: get(props, 'countries'),
                        setCountry: setSelectedCountry
                    },
                    'sortOrder': 50,
                    'id': 'country'
                },
                {
                    'component': { default: ProvinceAndPostcode },
                    'props': {
                        formId: formId,
                        selectedCountry: selectedCountry,
                        address: get(props, 'address', {}),
                        selectedProvince: get(props, 'address.province', '')
                    },
                    'sortOrder': 60,
                    'id': 'province'
                }
            ]}
        />
    </Form >
}