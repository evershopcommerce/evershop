import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from 'urql';
import { toast } from 'react-toastify';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';
import Area from '@components/common/Area';

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

const CurrencyQuery = `
  query Currencies {
    currencies {
      code
      name
    }
  }
`;

function Province({
  selectedCountry = 'US',
  selectedProvince,
  allowedCountries = [],
  fieldName = 'storeProvince'
}) {
  const [result] = useQuery({
    query: ProvincesQuery,
    variables: { countries: allowedCountries }
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }
  const provinces = data.provinces.filter(
    (p) => p.countryCode === selectedCountry
  );
  if (!provinces.length) {
    return null;
  }
  return (
    <div>
      <Field
        type="select"
        value={selectedProvince}
        name={fieldName}
        label="Province"
        placeholder="Province"
        validationRules={['notEmpty']}
        options={provinces.map((p) => ({ value: p.code, text: p.name }))}
      />
    </div>
  );
}

Province.propTypes = {
  allowedCountries: PropTypes.arrayOf(PropTypes.string),
  fieldName: PropTypes.string,
  selectedCountry: PropTypes.string,
  selectedProvince: PropTypes.string
};

Province.defaultProps = {
  allowedCountries: [],
  fieldName: 'storeProvince',
  selectedCountry: 'US',
  selectedProvince: ''
};

function Country({
  selectedCountry,
  setSelectedCountry,
  allowedCountries = [],
  fieldName = 'storeCountry'
}) {
  const onChange = (e) => {
    setSelectedCountry(e.target.value);
  };
  const [result] = useQuery({
    query: CountriesQuery,
    variables: { countries: allowedCountries }
  });

  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

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
        options={data.countries.map((c) => ({ value: c.code, text: c.name }))}
      />
    </div>
  );
}

Country.propTypes = {
  allowedCountries: PropTypes.arrayOf(PropTypes.string),
  fieldName: PropTypes.string,
  selectedCountry: PropTypes.string.isRequired,
  setSelectedCountry: PropTypes.func.isRequired
};

Country.defaultProps = {
  allowedCountries: [],
  fieldName: 'storeCountry'
};

function Currency({ selectedCurrency, fieldName = 'storeCurrency' }) {
  const [result] = useQuery({
    query: CurrencyQuery
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) {
    return (
      <p>
        Oh no...
        {error.message}
      </p>
    );
  }

  return (
    <Field
      type="select"
      value={selectedCurrency}
      name={fieldName}
      label="Currency"
      placeholder="Currency"
      options={data.currencies.map((c) => ({ value: c.code, text: c.name }))}
    />
  );
}

Currency.propTypes = {
  fieldName: PropTypes.string,
  selectedCurrency: PropTypes.string.isRequired
};

Currency.defaultProps = {
  fieldName: 'storeCurrency'
};

function StorePhoneNumber({ storePhoneNumber }) {
  return <div>
    <Field
      name="storePhoneNumber"
      label="Store Phone Number"
      placeholder="Store Phone Number"
      value={storePhoneNumber}
      type="text"
    />
  </div>
}

StorePhoneNumber.propTypes = {
  storePhoneNumber: PropTypes.string
};

StorePhoneNumber.defaultProps = {
  storePhoneNumber: ''
};

function StoreEmail({ storeEmail }) {
  return <div>
    <Field
      name="storeEmail"
      label="Store Email"
      placeholder="Store Email"
      value={storeEmail}
      type="text"
    />
  </div>
}

StoreEmail.propTypes = {
  storeEmail: PropTypes.string
};

StoreEmail.defaultProps = {
  storeEmail: ''
};

export default function StoreSetting({
  saveSettingApi,
  setting: {
    storeName,
    storeDescription,
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

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="storeSetting"
            action={saveSettingApi}
            onSuccess={(response) => {
              if (!response.error) {
                toast.success('Setting saved');
              } else {
                toast.error(response.error.message);
              }
            }}
          >
            <Card>
              <Card.Session title="Store Information">
                <Area
                  id="storeInfoSetting"
                  coreComponents={[
                    {
                      component: {
                        default: Field
                      },
                      props: {
                        name: 'storeName',
                        label: 'Store Name',
                        placeholder: 'Store Name',
                        value: storeName,
                        type: 'text'
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: Field
                      },
                      props: {
                        name: 'storeDescription',
                        label: 'Store Description',
                        placeholder: 'Store Description',
                        value: storeDescription,
                        type: 'textarea'
                      },
                      sortOrder: 20
                    }
                  ]}
                  noOuter
                />
              </Card.Session>
              <Card.Session title="Contact Information">
                <Area
                  id="storeContactSetting"
                  coreComponents={[
                    {
                      component: {
                        default: StorePhoneNumber
                      },
                      props: {
                        storePhoneNumber
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: StoreEmail
                      },
                      props: {
                        storeEmail
                      },
                      sortOrder: 20
                    }
                  ]}
                  className="grid grid-cols-2 gap-8 mt-8"
                />
              </Card.Session>
              <Card.Session title="Address">
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
                <div className="grid grid-cols-3 gap-8 mt-8">
                  <div>
                    <Field
                      name="storeCity"
                      label="City"
                      value={storeCity}
                      placeholder="City"
                      type="text"
                    />
                  </div>
                  <Province
                    selectedProvince={storeProvince}
                    selectedCountry={selectedCountry}
                  />
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
    </div>
  );
}

StoreSetting.propTypes = {
  saveSettingApi: PropTypes.string.isRequired,
  setting: PropTypes.shape({
    storeName: PropTypes.string,
    storeDescription: PropTypes.string,
    storeTimeZone: PropTypes.string,
    storePhoneNumber: PropTypes.string,
    storeEmail: PropTypes.string,
    storeCountry: PropTypes.string,
    storeAddress: PropTypes.string,
    storeCity: PropTypes.string,
    storeProvince: PropTypes.string,
    storePostalCode: PropTypes.string
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
    setting {
      storeName
      storeDescription
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
`;
