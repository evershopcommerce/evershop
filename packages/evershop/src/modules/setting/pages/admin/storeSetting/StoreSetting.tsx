import { Card } from '@components/admin/Card.js';
import { SettingMenu } from '@components/admin/SettingMenu.js';
import Spinner from '@components/admin/Spinner.js';
import Area from '@components/common/Area.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TelField } from '@components/common/form/TelField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import React from 'react';
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

const Province: React.FC<{
  selectedCountry: string;
  selectedProvince: string;
  allowedCountries?: string[];
  fieldName?: string;
}> = ({
  selectedCountry = 'US',
  selectedProvince,
  allowedCountries = [],
  fieldName = 'storeProvince'
}) => {
  const [result] = useQuery({
    query: ProvincesQuery,
    variables: { countries: allowedCountries }
  });
  const { data, fetching, error } = result;

  if (fetching)
    return (
      <div>
        <Spinner />
      </div>
    );
  if (error) {
    return <p className="text-red-500">{error.message}</p>;
  }
  const provinces = data.provinces.filter(
    (p) => p.countryCode === selectedCountry
  );
  if (!provinces.length) {
    return null;
  }
  return (
    <div>
      <SelectField
        id="storeProvince"
        defaultValue={selectedProvince}
        name={fieldName}
        label="Province"
        placeholder="Province"
        required
        options={provinces.map((p) => ({ value: p.code, label: p.name }))}
      />
    </div>
  );
};

const Country: React.FC<{
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  allowedCountries?: string[];
  fieldName?: string;
}> = ({
  selectedCountry,
  setSelectedCountry,
  allowedCountries = [],
  fieldName = 'storeCountry'
}) => {
  const onChange = (e) => {
    setSelectedCountry(e.target.value);
  };
  const [result] = useQuery({
    query: CountriesQuery,
    variables: { countries: allowedCountries }
  });

  const { data, fetching, error } = result;

  if (fetching)
    return (
      <div>
        <Spinner />
      </div>
    );
  if (error) {
    return <p className="text-red-500">{error.message}</p>;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <SelectField
        defaultValue={selectedCountry}
        name={fieldName}
        label="Country"
        placeholder="Country"
        onChange={onChange}
        required
        options={data.countries.map((c) => ({ value: c.code, label: c.name }))}
      />
    </div>
  );
};

const StorePhoneNumber: React.FC<{ storePhoneNumber: string }> = ({
  storePhoneNumber
}) => {
  return (
    <div>
      <TelField
        name="storePhoneNumber"
        label="Store Phone Number"
        placeholder="Store Phone Number"
        defaultValue={storePhoneNumber}
      />
    </div>
  );
};

const StoreEmail: React.FC<{ storeEmail: string }> = ({ storeEmail }) => {
  return (
    <div>
      <EmailField
        name="storeEmail"
        label="Store Email"
        placeholder="Store Email"
        defaultValue={storeEmail}
      />
    </div>
  );
};

interface StoreSettingProps {
  saveSettingApi: string;
  setting: {
    storeName: string;
    storeDescription: string;
    storePhoneNumber: string;
    storeEmail: string;
    storeCountry: string;
    storeAddress: string;
    storeCity: string;
    storeProvince: string;
    storePostalCode: string;
  };
}

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
}: StoreSettingProps) {
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
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form method="POST" id="storeSetting" action={saveSettingApi}>
            <Card>
              <Card.Session title="Store Information">
                <Area
                  id="storeInfoSetting"
                  coreComponents={[
                    {
                      component: {
                        default: (
                          <InputField
                            name="storeName"
                            label="Store Name"
                            required
                            placeholder="Store Name"
                            defaultValue={storeName}
                          />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: (
                          <TextareaField
                            name="storeDescription"
                            label="Store Description"
                            placeholder="Store Description"
                            defaultValue={storeDescription}
                            required
                          />
                        )
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
                  className="grid grid-cols-2 gap-5 mt-5"
                />
              </Card.Session>
              <Card.Session title="Address">
                <Country
                  selectedCountry={storeCountry}
                  setSelectedCountry={setSelectedCountry}
                />
                <InputField
                  name="storeAddress"
                  label="Address"
                  defaultValue={storeAddress}
                  placeholder="Store Address"
                />
                <div className="grid grid-cols-3 gap-5 mt-5">
                  <div>
                    <InputField
                      name="storeCity"
                      label="City"
                      defaultValue={storeCity}
                      placeholder="City"
                    />
                  </div>
                  <Province
                    selectedProvince={storeProvince}
                    selectedCountry={selectedCountry}
                  />
                  <div>
                    <InputField
                      name="storePostalCode"
                      label="Postal Code"
                      defaultValue={storePostalCode}
                      placeholder="Postal Code"
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
