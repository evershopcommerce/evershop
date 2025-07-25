import { Card } from '@components/admin/Card.js';
import Spinner from '@components/admin/Spinner.js';
import Button from '@components/common/form/Button.js';
import { Field } from '@components/common/form/Field.js';
import { Toggle } from '@components/common/form/fields/Toggle.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

const MethodsQuery = `
  query Methods {
    shippingMethods {
      value: shippingMethodId
      label: name
    }
    createShippingMethodApi: url(routeId: "createShippingMethod")
  }
`;

interface MethodFormProps {
  saveRateApi: string;
  closeModal: () => void;
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void>;
  rate?: {
    uuid: string;
    name: string;
    isCompound: boolean;
    rate: number;
    priority: number;
    country: string;
    province: string;
    postcode: string;
    updateApi: string;
    deleteApi: string;
  };
}

function RateForm({
  saveRateApi,
  closeModal,
  getTaxClasses,
  rate
}: MethodFormProps) {
  const [result] = useQuery({
    query: MethodsQuery
  });

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
          <div className="grid grid-cols-2 gap-8">
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
          <div className="grid grid-cols-3 gap-8">
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
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <Toggle
                name="is_compound"
                label="Is compound"
                value={rate?.isCompound || false}
              />
            </div>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-8 mt-8">
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
            <div />
          </div>
        </Card.Session>
        <Card.Session>
          <div className="flex justify-end gap-4">
            <Button title="Cancel" variant="secondary" onAction={closeModal} />
            <Button
              title="Save"
              variant="primary"
              onAction={() => {
                (
                  document.getElementById('taxRateForm') as HTMLFormElement
                ).dispatchEvent(
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

RateForm.defaultProps = {
  rate: null
};

export { RateForm };
