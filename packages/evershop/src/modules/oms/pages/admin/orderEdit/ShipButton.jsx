/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';
import { useAlertContext } from '@components/common/modal/Alert';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';
import { toast } from 'react-toastify';

export default function ShipButton({
  order: { shipment, createShipmentApi },
  carriers
}) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  if (shipment) {
    return null;
  } else {
    return (
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
                  isJSON
                  onSuccess={(response) => {
                    if (response.error) {
                      toast.error(response.error.message);
                    } else {
                      // Reload the page
                      window.location.reload();
                    }
                  }}
                  onValidationError={() => {
                    dispatchAlert({
                      type: 'update',
                      payload: { secondaryAction: { isLoading: false } }
                    });
                  }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Field
                        formId="ship-items"
                        type="text"
                        name="tracking_number"
                        label="Tracking number"
                        placeHolder="Tracking number"
                        value=""
                      />
                    </div>
                    <div>
                      <Field
                        formId="ship-items"
                        type="select"
                        name="carrier"
                        label="Carrier"
                        value=""
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
                document
                  .getElementById('ship-items')
                  .dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
              },
              variant: 'primary',
              isLoading: false
            }
          });
        }}
      />
    );
  }
}

ShipButton.propTypes = {
  order: PropTypes.shape({
    createShipmentApi: PropTypes.string.isRequired,
    shipment: PropTypes.shape({
      trackingNumber: PropTypes.string,
      carrier: PropTypes.string
    })
  }).isRequired,
  carriers: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.string
    })
  ).isRequired
};

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
      createShipmentApi
    },
    carriers {
      text: name
      value: code
    }
  }
`;
