import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import React from 'react';
import { useForm } from 'react-hook-form';

interface AddTrackingButtonProps {
  order: {
    shipment: {
      carrier: string;
      trackingNumber: string;
      updateShipmentApi: string;
    };
    createShipmentApi: string;
  };
  carriers: {
    value: string;
    label: string;
  }[];
}
export default function AddTrackingButton({
  order: { shipment },
  carriers
}: AddTrackingButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const form = useForm();
  if (!shipment) {
    return null;
  } else {
    return (
      <Button
        title="Edit Tracking Info"
        variant="primary"
        onAction={() => {
          openAlert({
            heading: 'Edit Tracking Information',
            content: (
              <div>
                <Form
                  form={form}
                  id="edit-tracking-info"
                  method="PATCH"
                  action={shipment.updateShipmentApi}
                  submitBtn={false}
                  onSuccess={() => {
                    location.reload();
                  }}
                  onInvalid={() => {
                    dispatchAlert({
                      type: 'update',
                      payload: { secondaryAction: { isLoading: false } }
                    });
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <InputField
                        type="text"
                        name="tracking_number"
                        label="Tracking number"
                        placeholder="Tracking number"
                        defaultValue={shipment.trackingNumber || ''}
                        required
                        validation={{
                          required: 'Tracking number is required'
                        }}
                      />
                    </div>
                    <div>
                      <SelectField
                        name="carrier"
                        label="Carrier"
                        defaultValue={shipment.carrier || ''}
                        required
                        options={carriers}
                        validation={{
                          required: 'Carrier is required'
                        }}
                      />
                    </div>
                  </div>
                </Form>
              </div>
            ),
            primaryAction: {
              title: 'Cancel',
              onAction: closeAlert,
              variant: ''
            },
            secondaryAction: {
              title: 'Update tracking',
              onAction: () => {
                dispatchAlert({
                  type: 'update',
                  payload: { secondaryAction: { isLoading: true } }
                });
                (
                  document.getElementById(
                    'edit-tracking-info'
                  ) as HTMLFormElement
                ).dispatchEvent(
                  new Event('submit', { cancelable: true, bubbles: true })
                );
              },
              variant: 'primary',
              isLoading: form.formState.isSubmitting
            }
          });
        }}
      />
    );
  }
}

export const layout = {
  areaId: 'order_actions',
  sortOrder: 5
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      shipment {
        shipmentId
        carrier
        trackingNumber
        updateShipmentApi
      }
      createShipmentApi
    },
    carriers {
      label: name
      value: code
    }
  }
`;
