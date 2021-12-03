import React from 'react';
import { Field } from "../../../../../lib/components/form/Field";
import { ProvinceOptions } from "../../../../../lib/components/locale/ProvinceOption";
import { CountryOptions } from "../../../../../lib/components/locale/CountryOption";
import Area from "../../../../../lib/components/Area";
import { get } from '../../../../../lib/util/get';

function Province({ selectedCountry, selectedProvince, formId }) {
    return <ProvinceOptions country={selectedCountry}>
        <Field
            type="select"
            value={selectedProvince}
            name="province"
            label={"Province"}
            placeholder="Province"
            validationRules={["notEmpty"]}
            formId={formId}
        />
    </ProvinceOptions>
}

function Country({ country, setCountry, countries = [], formId }) {

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

    const onChange = (e) => {
        setCountry(e.target.value);
    };

    return <div style={{ display: countries.length > 1 ? 'block' : 'none', marginTop: '1rem' }}>
        <CountryOptions countries={countries}>
            <Field
                type="select"
                value={selectedCountry}
                label="Country"
                name="country"
                placeholder="Country"
                onChange={onChange}
                formId={formId}
                validationRules={["notEmpty"]}
            />
        </CountryOptions>
    </div>
}

const NameAndTelephone = ({ formId, address }) => {
    return <div className="grid grid-cols-2 gap-1">
        <div>
            <Field
                type='text'
                name="full_name"
                value={get(address, 'full_name', '')}
                formId={formId}
                label="Full name"
                placeholder="Full Name"
                validationRules={['notEmpty']}
            />
        </div>
        <div>
            <Field
                type='text'
                name="telephone"
                value={get(address, 'telephone', '')}
                formId={formId}
                label="Telephone"
                placeholder="Telephone"
                validationRules={['notEmpty']}
            />
        </div>
    </div>
}

const ProvinceAndPostcode = ({ formId, address, selectedCountry, selectedProvince }) => {
    return <div className="grid grid-cols-2 gap-1 mt-1">
        <div>
            <Province
                selectedCountry={selectedCountry}
                selectedProvince={selectedProvince}
                formId={formId}
            />
        </div>
        <div>
            <Field
                type='text'
                name="postcode"
                value={get(address, 'postcode', '')}
                formId={formId}
                label="Postcode"
                placeholder="Postcode"
                validationRules={['notEmpty']}
            />
        </div>
    </div>
}

export function CustomerAddressForm(props) {
    const [selectedCountry, setSelectedCountry] = React.useState(get(props, 'address.country'));
    const formId = props.formId || "customer_address_form";
    const areaId = props.areaId || "customerAddressForm";

    return <Area
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
                'component': { default: Field },
                'props': {
                    type: 'text',
                    name: "address_1",
                    value: get(props, 'address.address_1', ''),
                    formId: formId,
                    label: "Address",
                    placeholder: "Address",
                    validationRules: ['notEmpty']
                },
                'sortOrder': 20,
                'id': 'address1'
            },
            {
                'component': { default: Field },
                'props': {
                    type: 'text',
                    name: "city",
                    value: get(props, 'address.city', ''),
                    formId: formId,
                    label: "City",
                    placeholder: "City",
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
                    setCountry: setSelectedCountry,
                    formId: formId
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
}