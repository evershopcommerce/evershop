import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import { useAlertContext } from '@components/common/modal/Alert';
import RenderIfTrue from '@components/common/RenderIfTrue';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

export default function CancelButton({
  order: { cancelApi, paymentStatus, shipmentStatus }
}) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  return (
    <RenderIfTrue
      condition={
        paymentStatus.isCancelable !== false &&
        shipmentStatus.isCancelable !== false
      }
    >
      <Button
        title="Cancel Order"
        variant="critical"
        onAction={() => {
          openAlert({
            heading: 'Cancel Order',
            content: (
              <div>
                <Form
                  id="cancelReason"
                  method="POST"
                  action={cancelApi}
                  submitBtn={false}
                  isJSON
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
                  onValidationError={() => {
                    dispatchAlert({
                      type: 'update',
                      payload: { secondaryAction: { isLoading: false } }
                    });
                  }}
                >
                  <div>
                    <Field
                      formId="cancelReason"
                      type="textarea"
                      name="reason"
                      label="Reason for cancellation"
                      placeHolder="Reason for cancellation"
                      value=""
                      validationRules={['notEmpty']}
                    />
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
              title: 'Cancel Order',
              onAction: () => {
                dispatchAlert({
                  type: 'update',
                  payload: { secondaryAction: { isLoading: true } }
                });
                document
                  .getElementById('cancelReason')
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
    </RenderIfTrue>
  );
}

CancelButton.propTypes = {
  order: PropTypes.shape({
    paymentStatus: PropTypes.shape({
      code: PropTypes.string,
      isCancelable: PropTypes.bool
    }).isRequired,
    shipmentStatus: PropTypes.shape({
      code: PropTypes.string,
      isCancelable: PropTypes.bool
    }).isRequired,
    cancelApi: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 35
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      paymentStatus {
        code
        isCancelable
      }
      shipmentStatus {
        code
        isCancelable
      }
      cancelApi
    }
  }
`;
