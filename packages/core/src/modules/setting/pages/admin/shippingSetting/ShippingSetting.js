import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Form } from '../../../../../lib/components/form/Form';
import { Card } from '../../../../cms/components/admin/Card';
import SettingMenu from '../../../components/SettingMenu';
import { useQuery } from 'urql';
import { toast } from 'react-toastify';
import Select from 'react-select';

const CountriesQuery = `
  query Country($countries: [String]) {
    countries (countries: $countries) {
      value: code
      label: name
    }
  }
`;

export function AllowCountries({
  selectedCountries = ''
}) {
  const [result, reexecuteQuery] = useQuery({
    query: CountriesQuery,
  });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <div>
      <div style={{ marginBottom: '0.3rem' }}>Allow Countries</div>
      <Select
        name='allowCountries'
        options={data.countries}
        hideSelectedOptions={true}
        isMulti={true}
        defaultValue={selectedCountries.map(c => { return { value: c, label: (data.countries.find(ctr => ctr.value === c))?.label } })}
      />
    </div>
  );
}

export default function StoreSetting({ saveSettingApi, setting: { allowCountries, weightUnit } }) {
  return <div className='main-content-inner'>
    <div className='grid grid-cols-6 gap-x-2 grid-flow-row '>
      <div className='col-span-2'>
        <SettingMenu />
      </div>
      <div className='col-span-4'>
        <Form
          method="POST"
          id='shippingSettingForm'
          action={saveSettingApi}
          onSuccess={(response) => {
            if (response?.success === true) {
              toast.success('Setting saved');
            }
          }}
        >
          <Card
          >
            <Card.Session title={"Shipping Details"}>
              <div>
                <AllowCountries
                  selectedCountries={allowCountries}
                />
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
      allowCountries
      weightUnit
    }
  }
`