/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-closing-tag-location */
import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';
import { useAlertContext } from '@components/common/modal/Alert';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';

export function FullfillButton({ shipment, createShipmentApi }) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  if (shipment) {
    return null;
  } else {
    return (
      <Button
        title="Fullfill items"
        variant="primary"
        onAction={() => {
          openAlert({
            heading: 'Fullfill items',
            content: (
              <div>
                <Form
                  id="fullfill-items"
                  method="POST"
                  action={createShipmentApi}
                  submitBtn={false}
                  isJSON
                  onSuccess={() => {
                    // Reload the page
                    window.location.reload();
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
                        formId="fullfill-items"
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
                        formId="fullfill-items"
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
              title: 'Fullfill',
              onAction: () => {
                dispatchAlert({
                  type: 'update',
                  payload: { secondaryAction: { isLoading: true } }
                });
                document
                  .getElementById('fullfill-items')
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

FullfillButton.propTypes = {
  createShipmentApi: PropTypes.string.isRequired,
  shipment: PropTypes.shape({
    trackingNumber: PropTypes.string,
    carrierName: PropTypes.string
  })
};

FullfillButton.defaultProps = {
  shipment: undefined
};
