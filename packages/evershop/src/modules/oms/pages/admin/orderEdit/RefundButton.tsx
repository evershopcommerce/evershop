import { Form } from '@components/common/form/Form.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import { Button } from '@components/common/ui/Button.js';
import { CardContent } from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface RefundButtonProps {
  order: {
    canRefund: boolean;
    refundApi: string;
    grandTotal: {
      value: number;
      currency: string;
    };
  };
}

/**
 * The one refund button, owned by core (OMS), not by any payment module. It is
 * shown automatically for every payment method whose `Order.canRefund` is true
 * (capability + refundable status), and posts to the single core refund route.
 * No per-gateway button, no per-gateway route.
 */
export default function RefundButton({
  order: { canRefund, refundApi, grandTotal }
}: RefundButtonProps) {
  const { openAlert, closeAlert, dispatchAlert } = useAlertContext();
  const [loading, setLoading] = React.useState(false);
  return (
    <RenderIfTrue condition={canRefund}>
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
                      id="orderRefund"
                      method="POST"
                      action={refundApi}
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
                      document.getElementById('orderRefund') as HTMLFormElement
                    ).dispatchEvent(
                      new Event('submit', { cancelable: true, bubbles: true })
                    );
                  },
                  variant: 'destructive',
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
    order(uuid: getContextValue("orderId")) {
      canRefund
      refundApi
      grandTotal {
        value
        currency
      }
    }
  }
`;
