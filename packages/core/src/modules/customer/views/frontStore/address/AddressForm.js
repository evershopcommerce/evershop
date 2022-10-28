/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prop-types */
import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import Area from '../../../../../lib/components/Area';
import { useQuery } from 'urql';

const ProvincesQuery = `
  query Province($countries: [String]) {
    provinces (countries: $countries) {
      code
      name
      countryCode
    }
  }
`;
const CountriesQuery = `
  query Country($countries: [String]) {
    countries (countries: $countries) {
      code
      name
    }
  }
`;
function Province({ selectedCountry = 'US', selectedProvince, allowCountries = [], formId }) {
  const [result, reexecuteQuery] = useQuery({
    query: ProvincesQuery,
    variables: { countries: allowCountries },
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <Field
      type="select"
      value={selectedProvince}
      name="province"
      label="Province"
      placeholder="Province"
      validationRules={['notEmpty']}
      formId={formId}
      options={
        data.provinces
          .filter(p => p.countryCode === selectedCountry)
          .map(p => { return { value: p.code, text: p.name } })
      }
    />
  );
}

Province.propTypes = {
  formId: PropTypes.string.isRequired,
  selectedProvince: PropTypes.string,
  allowCountries: PropTypes.arrayOf(PropTypes.string).isRequired
};

function Country({
  selectedCountry, setSelectedCountry, allowCountries = [], formId
}) {
  const onChange = (e) => {
    setSelectedCountry(e.target.value);
  };
  const [result, reexecuteQuery] = useQuery({
    query: CountriesQuery,
    variables: { countries: allowCountries },
  });

  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <div style={{ marginTop: '1rem' }}>
      <Field
        type="select"
        value={selectedCountry}
        label="Country"
        name="country"
        placeholder="Country"
        onChange={onChange}
        formId={formId}
        validationRules={['notEmpty']}
        options={data.countries.map(c => { return { value: c.code, text: c.name } })}
      />
    </div>
  );
}

Country.propTypes = {
  allowCountries: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCountry: PropTypes.string.isRequired,
  formId: PropTypes.string.isRequired,
  setSelectedCountry: PropTypes.func.isRequired
};

function NameAndTelephone({ formId, address }) {
  return (
    <div className="grid grid-cols-2 gap-1">
      <div>
        <Field
          type="text"
          name="full_name"
          value={address?.fullName}
          formId={formId}
          label="Full name"
          placeholder="Full Name"
          validationRules={['notEmpty']}
        />
      </div>
      <div>
        <Field
          type="text"
          name="telephone"
          value={address?.telephone}
          formId={formId}
          label="Telephone"
          placeholder="Telephone"
          validationRules={['notEmpty']}
        />
      </div>
    </div>
  );
}

function ProvinceAndPostcode({
  formId, address, allowCountries = [], selectedCountry
}) {
  return (
    <div className="grid grid-cols-2 gap-1 mt-1">
      <div>
        <Province
          address={address}
          allowCountries={allowCountries}
          selectedCountry={selectedCountry}
          selectedProvince={address?.province?.code}
          formId={formId}
        />
      </div>
      <div>
        <Field
          type="text"
          name="postcode"
          value={address?.postcode}
          formId={formId}
          label="Postcode"
          placeholder="Postcode"
          validationRules={['notEmpty']}
        />
      </div>
    </div>
  );
}

export function CustomerAddressForm({ allowCountries = [], address = {}, formId = 'customer_address_form', areaId = 'customerAddressForm' }) {
  const [selectedCountry, setSelectedCountry] = React.useState(() => {
    const country = address?.country?.code;
    if (!country || !allowCountries.includes(country)) {
      return allowCountries[0];
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
            formId,
            address: address
          },
          sortOrder: 10,
          id: 'fullName'
        },
        {
          component: { default: Field },
          props: {
            type: 'text',
            name: 'address_1',
            value: address?.address1,
            formId,
            label: 'Address',
            placeholder: 'Address',
            validationRules: ['notEmpty']
          },
          sortOrder: 20,
          id: 'address1'
        },
        {
          component: { default: Field },
          props: {
            type: 'text',
            name: 'city',
            value: address?.city,
            formId,
            label: 'City',
            placeholder: 'City',
            validationRules: []
          },
          sortOrder: 40,
          id: 'city'
        },
        {
          component: { default: Country },
          props: {
            selectedCountry: selectedCountry,
            allowCountries: allowCountries,
            setSelectedCountry: setSelectedCountry,
            formId
          },
          sortOrder: 50,
          id: 'country'
        },
        {
          component: { default: ProvinceAndPostcode },
          props: {
            formId,
            selectedCountry,
            address: address,
            allowCountries: allowCountries,
            selectedCountry: selectedCountry
          },
          sortOrder: 60,
          id: 'province'
        }
      ]}
    />
  );
}
