import { Card } from '@components/admin/Card.js';
import Spinner from '@components/admin/Spinner.js';
import Button from '@components/common/form/Button.js';
import { Field } from '@components/common/form/Field.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';
import Select from 'react-select';
import { useQuery } from 'urql';
import { ShippingZone } from './Zone.js';
import { ShippingCountry } from './Zones.js';

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
  const [selectedCountry, setSelectedCountry] =
    React.useState<ShippingCountry>();
  const [selectedProvinces, setSelectedProvinces] =
    React.useState<Array<{ value: string; label: string }>>();

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
      >
        <Card.Session title="Zone name">
          <Field
            name="name"
            type="text"
            placeholder="Enter zone name"
            validationRules={['notEmpty']}
            value={zone?.name}
          />
        </Card.Session>
        <Card.Session title="Country">
          <Select
            name="country"
            options={data.countries}
            hideSelectedOptions={false}
            isMulti={false}
            onChange={(e) => {
              setSelectedCountry((prev) => {
                if (e.value !== prev?.value) {
                  setSelectedProvinces([]);
                }
                return data.countries.find((c) => c.value === e.value);
              });
            }}
            aria-label="Select country"
            value={
              selectedCountry ||
              data.countries.find((c) => c.value === zone?.country?.code)
            }
          />
        </Card.Session>
        <Card.Session title="Provinces/States">
          <Select
            name="provinces[]"
            options={
              selectedCountry
                ? selectedCountry?.provinces
                : data.countries.find((c) => c.value === zone?.country?.code)
                    ?.provinces || []
            }
            hideSelectedOptions
            isMulti
            defaultValue={
              selectedProvinces ||
              zone?.provinces?.map((p) => ({
                value: p.code,
                label: p.name
              }))
            }
            value={
              selectedProvinces ||
              zone?.provinces?.map((p) => ({
                value: p.code,
                label: p.name
              }))
            }
            onChange={(e) => {
              setSelectedProvinces((prev) =>
                e.map((p) => ({ value: p.value, label: p.label }))
              );
            }}
          />
        </Card.Session>
        <Card.Session>
          <div className="flex justify-end gap-4">
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
