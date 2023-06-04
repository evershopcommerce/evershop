import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import Button from '@components/common/form/Button';
import { Toggle } from '@components/common/form/fields/Toggle';
import Spinner from '@components/common/Spinner';
import { useQuery } from 'urql';
import { toast } from 'react-toastify';

const MethodsQuery = `
  query Methods {
    shippingMethods {
      value: shippingMethodId
      label: name
    }
    createShippingMethodApi: url(routeId: "createShippingMethod")
  }
`;

function MethodForm({ saveRateApi, closeModal, getTaxClasses, rate }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [shippingMethod, setMethod] = React.useState(
    rate
      ? {
          value: rate.methodId,
          label: rate.name
        }
      : null
  );

  const [result, reexecuteQuery] = useQuery({
    query: MethodsQuery
  });

  const handleCreate = async (inputValue) => {
    setIsLoading(true);
    await fetch(result.data.createShippingMethodApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: inputValue
      })
    });
    reexecuteQuery({ requestPolicy: 'network-only' });
    setIsLoading(false);
  };

  if (result.fetching) {
    return (
      <div className="flex justify-center p-3">
        <Spinner width={25} height={25} />
      </div>
    );
  }

  return (
    <Card title="Tax rate">
      <Form
        id="taxRateForm"
        method={rate ? 'PATCH' : 'POST'}
        action={saveRateApi}
        submitBtn={false}
        onSuccess={async (response) => {
          if (!response.error) {
            await getTaxClasses({ requestPolicy: 'network-only' });
            closeModal();
            toast.success('Tax rate has been saved successfully!');
          } else {
            toast.error(response.error.message);
          }
        }}
      >
        <Card.Session title="Basic">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Field
                name="name"
                type="text"
                placeholder="Name"
                validationRules={['notEmpty']}
                label="Name"
                value={rate?.name}
              />
            </div>
            <div>
              <Field
                name="rate"
                type="text"
                label="Rate"
                placeholder="Rate"
                validationRules={['notEmpty']}
                value={rate?.rate}
                suffix="%"
              />
            </div>
          </div>
        </Card.Session>
        <Card.Session title="Setup shipping cost">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Field
                name="country"
                type="text"
                label="Country"
                placeholder="Country"
                validationRules={['notEmpty']}
                value={rate?.country}
              />
            </div>
            <div>
              <Field
                name="province"
                type="text"
                label="Provinces"
                placeholder="Provinces"
                validationRules={['notEmpty']}
                value={rate?.province}
              />
            </div>
            <div>
              <Field
                name="postcode"
                type="text"
                label="Postcode"
                placeholder="Postcode"
                validationRules={['notEmpty']}
                value={rate?.postcode}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Toggle
                name="is_compound"
                label="Is compound"
                value={rate?.isCompound}
              />
            </div>
            <div></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Field
                name="priority"
                type="text"
                label="Priority"
                placeholder="Priority"
                validationRules={['notEmpty']}
                value={rate?.priority}
              />
            </div>
            <div></div>
          </div>
        </Card.Session>
        <Card.Session>
          <div className="flex justify-end gap-1">
            <Button title="Cancel" variant="secondary" onAction={closeModal} />
            <Button
              title="Save"
              variant="primary"
              onAction={() => {
                document.getElementById('taxRateForm').dispatchEvent(
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

MethodForm.propTypes = {
  saveMethodApi: PropTypes.string.isRequired,
  closeModal: PropTypes.func.isRequired,
  getZones: PropTypes.func.isRequired,
  method: PropTypes.shape({
    name: PropTypes.string,
    cost: PropTypes.string,
    calculate_api: PropTypes.string
  })
};

export default MethodForm;
