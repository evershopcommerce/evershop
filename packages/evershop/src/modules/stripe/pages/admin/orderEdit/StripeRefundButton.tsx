import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import { Button } from '@components/common/ui/Button.js';
import { CardContent } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { toast } from 'react-toastify';

interface StripeRefundButtonProps {
  refundAPI: string;
  order: {
    paymentStatus: {
      code: string;
    };
    orderId: string;
    paymentMethod: string;
    grandTotal: {
      value: number;
      currency: string;
    };
  };
}
export default function StripeRefundButton({
  refundAPI,
  order: { paymentStatus, orderId, paymentMethod, grandTotal }
}: StripeRefundButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [loading, setLoading] = React.useState(false);
  return (
    <RenderIfTrue
      condition={
        paymentMethod === 'stripe' &&
        ['stripe_captured', 'stripe_partial_refunded'].includes(
          paymentStatus.code
        )
      }
    >
      <CardContent>
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => {
              openAlert({
                heading: _('Refund'),
                content: (
                  <div>
                    <Form
                      id="stripeRefund"
                      method="POST"
                      action={refundAPI}
                      submitBtn={false}
                      onSuccess={(response) => {
                        setLoading(false);
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
                        setLoading(false);
                        dispatchAlert({
                          type: 'update',
                          payload: { secondaryAction: { isLoading: false } }
                        });
                      }}
                    >
                      <div>
                        <NumberField
                          name="amount"
                          label={_('Refund amount')}
                          placeholder={_('Refund amount')}
                          defaultValue={grandTotal.value}
                          required
                          validation={{
                            required: _('This field is required'),
                            min: {
                              value: 0,
                              message: _(
                                'Amount must be greater than or equal to 0'
                              )
                            },
                            max: {
                              value: String(grandTotal.value),
                              message: _(
                                'Amount must be less than or equal to ${value} ${currency}',
                                {
                                  value: String(grandTotal.value),
                                  currency: grandTotal.currency
                                }
                              )
                            }
                          }}
                          helperText={_('Maximum amount is ${value} ${currency}', {
                            value: String(grandTotal.value),
                            currency: grandTotal.currency
                          })}
                          unit={grandTotal.currency}
                        />
                      </div>
                      <InputField
                        type="hidden"
                        name="order_id"
                        defaultValue={orderId}
                      />
                    </Form>
                  </div>
                ),
                primaryAction: {
                  title: _('Cancel'),
                  onAction: closeAlert,
                  variant: ''
                },
                secondaryAction: {
                  title: _('Refund'),
                  onAction: () => {
                    setLoading(true);
                    dispatchAlert({
                      type: 'update',
                      payload: { secondaryAction: { isLoading: true } }
                    });
                    (
                      document.getElementById('stripeRefund') as HTMLFormElement
                    ).dispatchEvent(
                      new Event('submit', { cancelable: true, bubbles: true })
                    );
                  },
                  variant: 'secondary',
                  isLoading: loading
                }
              });
            }}
          >
            {_('Refund')}
          </Button>
        </div>
      </CardContent>
    </RenderIfTrue>
  );
}

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
