import { Card } from '@components/admin/Card.js';
import Spinner from '@components/admin/Spinner.js';
import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { ReactSelectField } from '@components/common/form/ReactSelectField.js';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'urql';
import { ShippingZone } from './Zone.js';

export interface ZoneFormProps {
  formMethod?: 'POST' | 'PATCH';
  saveZoneApi: string;
  onSuccess: () => void;
  reload: () => void;
  zone?: ShippingZone;
}

const CountriesQuery = `
  query Country {
    countries {
      value: code
      label: name
      provinces {
        value: code
        label: name
      }
    }
  }
`;

function ZoneForm({
  formMethod,
  saveZoneApi,
  onSuccess,
  reload,
  zone
}: ZoneFormProps) {
  const form = useForm();
  const countryWatch = form.watch('country', zone?.country?.code);
  const [{ data, fetching, error }] = useQuery({
    query: CountriesQuery
  });

  if (fetching) return <Spinner />;
  if (error) {
    return <p className="text-critical">Error loading countries</p>;
  }
  return (
    <Card title="Create a shipping zone">
      <Form
        id="createShippingZone"
        method={formMethod || 'POST'}
        action={saveZoneApi}
        submitBtn={false}
        onSuccess={async () => {
          await reload();
          onSuccess();
        }}
        form={form}
      >
        <Card.Session title="Zone name">
          <InputField
            name="name"
            placeholder="Enter zone name"
            required
            validation={{ required: 'Zone name is required' }}
            value={zone?.name}
          />
        </Card.Session>
        <Card.Session title="Country">
          <ReactSelectField
            name="country"
            options={data.countries}
            hideSelectedOptions={false}
            isMulti={false}
            aria-label="Select country"
            defaultValue={zone?.country?.code}
          />
        </Card.Session>
        <Card.Session title="Provinces/States">
          <ReactSelectField
            name="provinces"
            options={
              data.countries.find((c) => c.value === countryWatch)?.provinces ||
              []
            }
            hideSelectedOptions
            isMulti
            defaultValue={(zone?.provinces || []).map(
              (province) => province.code
            )}
          />
        </Card.Session>
        <Card.Session>
          <div className="flex justify-end gap-2">
            <Button
              title="Save"
              variant="primary"
              onAction={() => {
                const form = document.getElementById(
                  'createShippingZone'
                ) as HTMLFormElement | null;
                if (form) {
                  form.dispatchEvent(
                    new Event('submit', {
                      cancelable: true,
                      bubbles: true
                    })
                  );
                }
              }}
            />
          </div>
        </Card.Session>
      </Form>
    </Card>
  );
}

export { ZoneForm };
