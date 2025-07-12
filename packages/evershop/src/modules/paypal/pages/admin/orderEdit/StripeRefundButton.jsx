import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import { useAlertContext } from '@components/common/modal/Alert';
import RenderIfTrue from '@components/common/RenderIfTrue';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

export default function StripeRefundButton({
  refundAPI,
  order: { paymentStatus, orderId, paymentMethod, grandTotal }
}) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  return (
    <RenderIfTrue
      condition={
        paymentMethod === 'stripe' &&
        ['paid', 'partial_refunded'].includes(paymentStatus.code)
      }
    >
      <Card.Session>
        <div className="flex justify-end">
          <Button
            title="Refund"
            variant="secondary"
            onAction={() => {
              openAlert({
                heading: 'Refund',
                content: (
                  <div>
                    <Form
                      id="stripeRefund"
                      method="POST"
                      action={refundAPI}
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
                          formId="stripeRefund"
                          type="text"
                          name="amount"
                          label="Refund amount"
                          placeHolder="Refund amount"
                          value={grandTotal.value}
                          validationRules={['notEmpty']}
                          suffix={grandTotal.currency}
                        />
                      </div>
                      <input type="hidden" name="order_id" value={orderId} />
                    </Form>
                  </div>
                ),
                primaryAction: {
                  title: 'Cancel',
                  onAction: closeAlert,
                  variant: ''
                },
                secondaryAction: {
                  title: 'Refund',
                  onAction: () => {
                    dispatchAlert({
                      type: 'update',
                      payload: { secondaryAction: { isLoading: true } }
                    });
                    document
                      .getElementById('stripeRefund')
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
        </div>
      </Card.Session>
    </RenderIfTrue>
  );
}

StripeRefundButton.propTypes = {
  refundAPI: PropTypes.string.isRequired,
  order: PropTypes.shape({
    paymentStatus: PropTypes.shape({
      code: PropTypes.string.isRequired
    }).isRequired,
    orderId: PropTypes.string.isRequired,
    paymentMethod: PropTypes.string.isRequired,
    grandTotal: PropTypes.shape({
      value: PropTypes.number.isRequired,
      currency: PropTypes.string.isRequired
    }).isRequired
  }).isRequired
};

export const layout = {
  areaId: 'orderPaymentActions',
  sortOrder: 10
};

export const query = `
  query Query {
    refundAPI: url(routeId: "refundPaymentIntent")
    order(uuid: getContextValue("orderId")) {
      orderId
      grandTotal {
        value
        currency
      }
      paymentStatus {
        code
      }
      paymentMethod
    }
  }
`;
