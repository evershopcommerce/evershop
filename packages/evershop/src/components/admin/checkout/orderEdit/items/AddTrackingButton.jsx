/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';
import { useAlertContext } from '@components/common/modal/Alert';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';

export function AddTrackingButton({ shipment }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  if (!shipment || shipment.trackingNumber || shipment.carrierName) return null;
  else {
    return (
      <Button
        title="Add tracking number"
        variant="primary"
        onAction={() => {
          openAlert({
            heading: 'Add tracking information',
            content: (
              <div>
                <Form
                  id="add-tracking-items"
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
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <Field
                        formId="add-tracking-items"
                        type="text"
                        name="tracking_number"
                        label="Tracking number"
                        placeHolder="Tracking number"
                        value=""
                        validationRules={['notEmpty']}
                      />
                    </div>
                    <div>
                      <Field
                        formId="add-tracking-items"
                        type="select"
                        name="carrier_name"
                        label="Carrier"
                        value=""
                        options={[
                          { value: 'Fedex', text: 'Fedex' },
                          { value: 'USPS', text: 'USPS' },
                          { value: 'UPS', text: 'UPS' }
                        ]} // TODO: List of carrier should be configurable
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
                  .getElementById('add-tracking-items')
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
  shipment: PropTypes.shape({
    carrierName: PropTypes.string,
    trackingNumber: PropTypes.string,
    updateShipmentApi: PropTypes.string.isRequired
  })
};

AddTrackingButton.defaultProps = {
  shipment: undefined
};
