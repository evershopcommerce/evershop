import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import React from 'react';
import { toast } from 'react-toastify';

interface ShipButtonProps {
  order: {
    shipment?: {
      trackingNumber?: string;
      carrier?: string;
    };
    createShipmentApi: string;
    shipmentStatus: {
      code: string;
    };
  };
  carriers: {
    label: string;
    value: string;
  }[];
}
export default function ShipButton({
  order: { shipment, createShipmentApi, shipmentStatus },
  carriers
}: ShipButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  if (shipment) {
    return null;
  } else {
    return (
      <RenderIfTrue condition={shipmentStatus.code !== 'canceled'}>
        <Button
          title="Ship Items"
          variant="primary"
          onAction={() => {
            openAlert({
              heading: 'Ship Items',
              content: (
                <div>
                  <Form
                    id="ship-items"
                    method="POST"
                    action={createShipmentApi}
                    submitBtn={false}
                    onSuccess={(response) => {
                      if (response.error) {
                        toast.error(response.error.message);
                        dispatchAlert({
                          type: 'update',
                          payload: { secondaryAction: { isLoading: false } }
                        });
                      } else {
                        // Reload the page
                        window.location.reload();
                      }
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
                        />
                      </div>
                      <div>
                        <SelectField
                          name="carrier"
                          label="Carrier"
                          options={carriers}
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
                title: 'Ship',
                onAction: () => {
                  dispatchAlert({
                    type: 'update',
                    payload: { secondaryAction: { isLoading: true } }
                  });
                  (
                    document.getElementById('ship-items') as HTMLFormElement
                  ).dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
                },
                variant: 'primary',
                isLoading: false
              }
            });
          }}
        />
      </RenderIfTrue>
    );
  }
}

export const layout = {
  areaId: 'order_actions',
  sortOrder: 10
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
      shipmentStatus {
        code
      }
      createShipmentApi
    },
    carriers {
      label: name
      value: code
    }
  }
`;
