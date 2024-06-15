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
import PriceBasedPrice from '@components/admin/checkout/shippingSetting/PriceBasedPrice';
import WeightBasedPrice from '@components/admin/checkout/shippingSetting/WeightBasedPrice';
import { Input } from '@components/common/form/fields/Input';

const MethodsQuery = `
  query Methods {
    shippingMethods {
      value: shippingMethodId
      label: name
      updateApi
    }
    createShippingMethodApi: url(routeId: "createShippingMethod")
  }
`;

function Condition({ method }) {
  const [type, setType] = React.useState(method?.conditionType || 'price');
  return (
    <div>
      <div className="mb-4">
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
      <div className="grid grid-cols-2 gap-8">
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
  const [type, setType] = React.useState(() => {
    if (method?.calculateApi) {
      return 'api';
    }
    if (method?.priceBasedCost) {
      return 'price_based_rate';
    }
    if (method?.weightBasedCost) {
      return 'weight_based_rate';
    }
    return 'flat_rate';
  });
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
  const [name, setName] = React.useState(method?.name || '');
  const [updatingName, setUpdatingName] = React.useState(false);

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

  const currentMethod = result.data.shippingMethods.find(
    (m) => m.value === shippingMethod?.value
  );

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
            toast.success('Shipping method saved successfully');
          } else {
            toast.error(response.error.message);
          }
        }}
      >
        <Card.Session title="Method name">
          {!method ? (
            <CreatableSelect
              isClearable
              isDisabled={isLoading}
              isLoading={isLoading}
              onChange={(newValue) => setMethod(newValue)}
              onCreateOption={handleCreate}
              options={result.data.shippingMethods}
              value={shippingMethod}
            />
          ) : (
            <div className="flex gap-4 justify-start items-center">
              <Input
                name="name"
                type="text"
                placeholder="Method name"
                validationRules={['notEmpty']}
                value={name}
                disabled={!updatingName}
                suffix={
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (updatingName) setName(method.name);
                      setUpdatingName(!updatingName);
                    }}
                  >
                    <span className="text-interactive">
                      {updatingName ? 'Cancel' : 'Edit'}
                    </span>
                  </a>
                }
                onChange={(e) => setName(e.target.value)}
              />
              {updatingName && (
                <Button
                  title="Save"
                  variant="primary"
                  onAction={async () => {
                    // Use fetch to call the API (method.updateApi) to update the method name
                    // The API should accept a PATCH request with the new name as the payload
                    // The API should return the updated method object
                    const response = await fetch(currentMethod.updateApi, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      credentials: 'same-origin',
                      body: JSON.stringify({
                        name
                      })
                    });
                    const data = await response.json();
                    if (response.ok) {
                      setName(data.name);
                      setUpdatingName(false);
                    } else {
                      toast.error(data.error.message);
                    }
                  }}
                />
              )}
            </div>
          )}
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
              { text: 'Price based rate', value: 'price_based_rate' },
              { text: 'Weight based rate', value: 'weight_based_rate' },
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
          {type === 'price_based_rate' && (
            <PriceBasedPrice lines={method?.priceBasedCost || []} />
          )}
          {type === 'weight_based_rate' && (
            <WeightBasedPrice lines={method?.weightBasedCost || []} />
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
          <div className="flex justify-end gap-4">
            <Button
              title="Cancel"
              variant="secondary"
              onAction={async () => {
                await getZones({ requestPolicy: 'network-only' });
                closeModal();
              }}
            />
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
    priceBasedCost: PropTypes.arrayOf(
      PropTypes.shape({
        minPrice: PropTypes.shape({
          value: PropTypes.number
        }),
        cost: PropTypes.shape({
          value: PropTypes.number
        })
      })
    ),
    weightBasedCost: PropTypes.arrayOf(
      PropTypes.shape({
        minWeight: PropTypes.shape({
          value: PropTypes.number
        }),
        cost: PropTypes.shape({
          value: PropTypes.number
        })
      })
    ),
    conditionType: PropTypes.string,
    min: PropTypes.string,
    max: PropTypes.string
  })
};

MethodForm.defaultProps = {
  method: null
};

export default MethodForm;
