/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';
import { useAlertContext } from '@components/common/modal/Alert';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';

export default function AddTrackingButton({ order: { shipment }, carriers }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
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
                  id="edit-tracking-info"
                  method="PATCH"
                  action={shipment.updateShipmentApi}
                  submitBtn={false}
                  isJSON
                  onSuccess={() => {
                    // eslint-disable-next-line no-restricted-globals
                    location.reload();
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
                        formId="edit-tracking-info"
                        type="text"
                        name="tracking_number"
                        label="Tracking number"
                        placeHolder="Tracking number"
                        value={shipment.trackingNumber || ''}
                        validationRules={['notEmpty']}
                      />
                    </div>
                    <div>
                      <Field
                        formId="edit-tracking-info"
                        type="select"
                        name="carrier"
                        label="Carrier"
                        value={shipment.carrier || ''}
                        options={carriers}
                        validationRules={['notEmpty']}
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
                document
                  .getElementById('edit-tracking-info')
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

AddTrackingButton.propTypes = {
  order: PropTypes.shape({
    shipment: PropTypes.shape({
      carrier: PropTypes.string,
      trackingNumber: PropTypes.string,
      updateShipmentApi: PropTypes.string.isRequired
    }).isRequired
  }).isRequired,
  carriers: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      text: PropTypes.string
    })
  ).isRequired
};

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
      text: name
      value: code
    }
  }
`;
