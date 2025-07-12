import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';

function ZoneForm({
  method,
  saveZoneApi,
  countries,
  closeModal,
  getZones,
  zone
}) {
  const [country, setCountry] = React.useState(
    countries.find((c) => c.value === zone?.country?.code)
  );
  const [provinces, setProvinces] = React.useState(
    countries.find((c) => c.value === zone?.country?.code)?.provinces || []
  );

  const [selectedProvinces, setSelectedProvinces] = React.useState(
    provinces.filter((p) => zone?.provinces?.find((z) => z.code === p.value))
  );

  React.useEffect(() => {
    setSelectedProvinces(
      country?.provinces.filter((p) =>
        zone?.provinces?.find((z) => z.code === p.value)
      )
    );
  }, [country]);

  return (
    <Card title="Create a shipping zone">
      <Form
        id="createShippingZone"
        method={method || 'POST'}
        action={saveZoneApi}
        submitBtn={false}
        onSuccess={async () => {
          await getZones({ requestPolicy: 'network-only' });
          closeModal();
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
            options={countries}
            hideSelectedOptions={false}
            isMulti={false}
            onChange={(e) => {
              setCountry(countries.find((c) => c.value === e.value));
              setProvinces(
                countries.find((c) => c.value === e.value)?.provinces
              );
            }}
            aria-label="Select country"
            value={country}
          />
        </Card.Session>
        <Card.Session title="Provinces/States">
          <Select
            name="provinces[]"
            options={provinces}
            hideSelectedOptions
            isMulti
            defaultValue={selectedProvinces}
            value={selectedProvinces}
            onChange={(e) => {
              setSelectedProvinces(e);
            }}
          />
        </Card.Session>
        <Card.Session>
          <div className="flex justify-end gap-4">
            <Button title="Cancel" variant="secondary" onAction={closeModal} />
            <Button
              title="Save"
              variant="primary"
              onAction={() => {
                document.getElementById('createShippingZone').dispatchEvent(
                  new Event('submit', {
                    cancelable: true,
                    bubbles: true
                  })
                );
              }}
            />
          </div>
        </Card.Session>
      </Form>
    </Card>
  );
}

ZoneForm.propTypes = {
  method: PropTypes.string,
  saveZoneApi: PropTypes.string.isRequired,
  countries: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      provinces: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired
        })
      )
    })
  ).isRequired,
  closeModal: PropTypes.func.isRequired,
  getZones: PropTypes.func.isRequired,
  zone: PropTypes.shape({
    uuid: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    country: PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
    provinces: PropTypes.arrayOf(
      PropTypes.shape({
        code: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
      })
    ).isRequired
  })
};

ZoneForm.defaultProps = {
  method: 'POST',
  zone: null
};

export default ZoneForm;
