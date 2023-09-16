import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import Button from '@components/common/form/Button';
import { Radio } from '@components/common/form/fields/Radio';
import { Toggle } from '@components/common/form/fields/Toggle';
import CreatableSelect from 'react-select/creatable';
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

function Condition({ method }) {
  const [type, setType] = React.useState(method?.conditionType || 'price');
  return (
    <div>
      <div className="mb-1">
        <Radio
          name="condition_type"
          options={[
            { value: 'price', text: 'Based on order price' },
            { value: 'weight', text: 'Based on order weight' }
          ]}
          onChange={(value) => setType(value)}
          value={type}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Field
            name="min"
            label={
              type === 'price' ? 'Minimum order price' : 'Minimum order weight'
            }
            placeholder={
              type === 'price' ? 'Minimum order price' : 'Minimum order weight'
            }
            type="text"
            value={method?.min}
            validationRules={['notEmpty']}
          />
        </div>
        <div>
          <Field
            name="max"
            label={
              type === 'price' ? 'Maximum order price' : 'Maximum order weight'
            }
            placeholder={
              type === 'price' ? 'Maximum order price' : 'Maximum order weight'
            }
            type="text"
            value={method?.max}
            validationRules={['notEmpty']}
          />
        </div>
      </div>
    </div>
  );
}

Condition.propTypes = {
  method: PropTypes.shape({
    conditionType: PropTypes.string,
    min: PropTypes.string,
    max: PropTypes.string
  })
};

Condition.defaultProps = {
  method: null
};

function MethodForm({ saveMethodApi, closeModal, getZones, method }) {
  const [type, setType] = React.useState(
    method?.calculateApi ? 'api' : 'flat_rate'
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [shippingMethod, setMethod] = React.useState(
    method
      ? {
          value: method.methodId,
          label: method.name
        }
      : null
  );
  const [hasCondition, setHasCondition] = React.useState(
    !!method?.conditionType
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
    <Card title="Shipping method">
      <Form
        id="shippingMethodForm"
        method={method ? 'PATCH' : 'POST'}
        action={saveMethodApi}
        submitBtn={false}
        onSuccess={async (response) => {
          if (!response.error) {
            await getZones({ requestPolicy: 'network-only' });
            closeModal();
          } else {
            toast.error(response.error.message);
          }
        }}
      >
        <Card.Session title="Method name">
          <CreatableSelect
            isClearable
            isDisabled={isLoading}
            isLoading={isLoading}
            onChange={(newValue) => setMethod(newValue)}
            onCreateOption={handleCreate}
            options={result.data.shippingMethods}
            value={shippingMethod}
          />
          <Field
            type="hidden"
            name="method_id"
            value={shippingMethod?.value}
            validationRules={['notEmpty']}
          />
          <Toggle name="is_enabled" label="Status" value={method?.isEnabled} />
        </Card.Session>
        <Card.Session title="Setup shipping cost">
          <Radio
            name="calculation_type"
            options={[
              { text: 'Flat rate', value: 'flat_rate' },
              { text: 'API calculate', value: 'api' }
            ]}
            defaultValue={method?.calculateApi ? 'api' : 'flat_rate'}
            value={type}
            onChange={(value) => {
              setType(value);
            }}
          />
          {type === 'flat_rate' && (
            <Field
              name="cost"
              type="text"
              placeholder="Shipping cost"
              validationRules={['notEmpty']}
              value={method?.cost?.value}
            />
          )}
          {type === 'api' && (
            <Field
              name="calculate_api"
              type="text"
              placeholder="Calculate API endpoint"
              validationRules={['notEmpty']}
              value={method?.calculateApi}
              instruction="This API will be called to calculate shipping cost. It supposed to return a number."
            />
          )}
          <a
            href="#"
            className="text-interactive"
            onClick={(e) => {
              e.preventDefault();
              setHasCondition(!hasCondition);
            }}
          >
            {hasCondition ? 'Remove condition' : 'Add condition'}
          </a>
          {!hasCondition && (
            <input name="condition_type" type="hidden" value="none" />
          )}
          {hasCondition && <Condition method={method} />}
        </Card.Session>
        <Card.Session>
          <div className="flex justify-end gap-1">
            <Button title="Cancel" variant="secondary" onAction={closeModal} />
            <Button
              title="Save"
              variant="primary"
              onAction={() => {
                document.getElementById('shippingMethodForm').dispatchEvent(
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
    methodId: PropTypes.string,
    name: PropTypes.string,
    isEnabled: PropTypes.bool,
    calculateApi: PropTypes.string,
    cost: PropTypes.shape({
      value: PropTypes.string
    }),
    conditionType: PropTypes.string,
    min: PropTypes.string,
    max: PropTypes.string
  })
};

MethodForm.defaultProps = {
  method: null
};

export default MethodForm;
