import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '../../../../../lib/components/form/Field';
import { Form } from '../../../../../lib/components/form/Form';
import { Card } from '../../../../cms/components/admin/Card';
import SettingMenu from '../../../components/SettingMenu';
import { useQuery } from 'urql';
import { toast } from 'react-toastify';

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

const TimezonesQuery = `
  query Timezones {
    timezones {
      code
      name
    }
  }
`;

const CurrencyQuery = `
  query Currencies {
    currencies {
      code
      name
    }
  }
`;

function Province({ selectedCountry = 'US', selectedProvince, allowCountries = [], fieldName = 'storeProvince' }) {
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
      name={fieldName}
      label="Province"
      placeholder="Province"
      validationRules={['notEmpty']}
      options={
        data.provinces
          .filter(p => p.countryCode === selectedCountry)
          .map(p => { return { value: p.code, text: p.name } })
      }
    />
  );
}

Province.propTypes = {
  selectedProvince: PropTypes.string,
  allowCountries: PropTypes.arrayOf(PropTypes.string)
};

function Country({
  selectedCountry, setSelectedCountry, allowCountries = [], fieldName = 'storeCountry'
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
        name={fieldName}
        placeholder="Country"
        onChange={onChange}
        validationRules={['notEmpty']}
        options={data.countries.map(c => { return { value: c.code, text: c.name } })}
      />
    </div>
  );
}

Country.propTypes = {
  allowCountries: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCountry: PropTypes.string.isRequired,
  setSelectedCountry: PropTypes.func.isRequired
};

function Timezone({ selectedTimeZone, fieldName = 'storeTimeZone' }) {
  const [result, reexecuteQuery] = useQuery({
    query: TimezonesQuery
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <Field
      type="select"
      value={selectedTimeZone}
      name={fieldName}
      label="TimeZone"
      placeholder="TimeZone"
      options={
        data.timezones.map(t => { return { value: t.code, text: t.name } })
      }
    />
  );
}

Timezone.propTypes = {
  selectedTimeZone: PropTypes.string,
  fieldName: PropTypes.string
};


function Currency({ selectedCurrency, fieldName = 'storeCurrency' }) {
  const [result, reexecuteQuery] = useQuery({
    query: CurrencyQuery
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <Field
      type="select"
      value={selectedCurrency}
      name={fieldName}
      label="Currency"
      placeholder="Currency"
      options={
        data.currencies.map(c => { return { value: c.code, text: c.name } })
      }
    />
  );
}

Currency.propTypes = {
  selectedCurrency: PropTypes.string,
  fieldName: PropTypes.string
};

export default function StoreSetting({
  saveSettingApi,
  setting: {
    storeName,
    storeDescription,
    storeCurrency,
    storeTimeZone,
    storePhoneNumber,
    storeEmail,
    storeCountry,
    storeAddress,
    storeCity,
    storeProvince,
    storePostalCode
  }
}) {
  const [selectedCountry, setSelectedCountry] = React.useState(() => {
    const country = storeCountry;
    if (!country) {
      return 'US';
    } else {
      return country;
    }
  });

  return <div className='main-content-inner'>
    <div className='grid grid-cols-6 gap-x-2 grid-flow-row '>
      <div className='col-span-2'>
        <SettingMenu />
      </div>
      <div className='col-span-4'>
        <Form
          method="POST"
          id="storeSetting"
          action={saveSettingApi}
          onSuccess={(response) => {
            if (response?.success === true) {
              toast.success('Setting saved');
            }
          }}
        >
          <Card
          >
            <Card.Session title={"Store Information"}>
              <Field
                name="storeName"
                label="Store Name"
                placeholder="Store Name"
                value={storeName}
                type="text"
              />
              <Field
                name="storeDescription"
                label="Store Description"
                placeholder="Store Description"
                value={storeDescription}
                type="textarea"
              />
              <div className='grid grid-cols-2 gap-2 mt-2'>
                <div>
                  <Currency
                    selectedCurrency={storeCurrency}
                  />
                </div>
                <div>
                  <Timezone selectedTimeZone={storeTimeZone} />
                </div>
              </div>
            </Card.Session>
            <Card.Session title={"Contact Information"}>
              <div className='grid grid-cols-2 gap-2 mt-2'>
                <div>
                  <Field
                    name="storePhoneNumber"
                    label="Store Phone Number"
                    value={storePhoneNumber}
                    placeholder="Store Phone Number"
                    type="text"
                  />
                </div>
                <div>
                  <Field
                    name="storeEmail"
                    label="Store Email"
                    value={storeEmail}
                    placeholder="Store Email"
                    type="text"
                  />
                </div>
              </div>
            </Card.Session>
            <Card.Session title={"Address"}>
              <Country
                selectedCountry={storeCountry}
                setSelectedCountry={setSelectedCountry}
              />
              <Field
                name="storeAddress"
                label="Address"
                value={storeAddress}
                placeholder="Store Address"
                type="text"
              />
              <div className='grid grid-cols-3 gap-2 mt-2'>
                <div>
                  <Field
                    name="storeCity"
                    label="City"
                    value={storeCity}
                    placeholder="City"
                    type="text"
                  />
                </div>
                <div>
                  <Province
                    selectedProvince={storeProvince}
                    selectedCountry={selectedCountry}
                  />
                </div>
                <div>
                  <Field
                    name="storePostalCode"
                    label="PostalCode"
                    value={storePostalCode}
                    placeholder="PostalCode"
                    type="text"
                  />
                </div>
              </div>
            </Card.Session>
          </Card>
        </Form>
      </div>
    </div>
  </div>;
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
    setting {
      storeName
      storeDescription
      storeCurrency
      storeTimeZone
      storePhoneNumber
      storeEmail
      storeCountry
      storeAddress
      storeCity
      storeProvince
      storePostalCode
    }
  }
`