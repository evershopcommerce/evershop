import PropTypes from 'prop-types';
import React from 'react';
import { useQuery } from 'urql';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';

const CountriesQuery = `
  query Country($countries: [String]) {
    countries (countries: $countries) {
      value: code
      label: name
    }
  }
`;

export function AllowCountries({ selectedCountries = [] }) {
  const [result] = useQuery({
    query: CountriesQuery
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
    <div>
      <div style={{ marginBottom: '0.3rem' }}>Allow Countries</div>
      <Select
        name="allowedCountries[]"
        options={data.countries}
        hideSelectedOptions
        isMulti
        defaultValue={selectedCountries.map((c) => ({
          value: c,
          label: data.countries.find((ctr) => ctr.value === c)?.label
        }))}
      />
    </div>
  );
}

AllowCountries.propTypes = {
  selectedCountries: PropTypes.arrayOf(PropTypes.string)
};

AllowCountries.defaultProps = {
  selectedCountries: []
};

export default function StoreSetting({
  saveSettingApi,
  setting: { allowedCountries, weightUnit }
}) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-2 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="shippingSettingForm"
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
              <Card.Session title="Shipping Details">
                <div>
                  <AllowCountries selectedCountries={allowedCountries} />
                  <Field
                    name="weightUnit"
                    label="Weight Unit"
                    placeholder="Weight Unit"
                    type="select"
                    value={weightUnit}
                    options={[
                      { value: 'kg', text: 'kg' },
                      { value: 'lb', text: 'lb' }
                    ]}
                  />
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
    allowedCountries: PropTypes.arrayOf(PropTypes.string),
    weightUnit: PropTypes.string
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
      allowedCountries
      weightUnit
    }
  }
`;
