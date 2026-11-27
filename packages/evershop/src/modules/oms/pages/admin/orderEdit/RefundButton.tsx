import { Form } from '@components/common/form/Form.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import { Button } from '@components/common/ui/Button.js';
import { CardContent } from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';

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
  const { openAlert, closeAlert } = useAlertContext();
  // The same options `<Form>` uses for the form it creates itself.
  const form = useForm({ shouldUnregister: true, shouldFocusError: false });

  // Returns when the refund is done (or refused), so the alert's Refund
  // button shows a spinner for exactly that long; on success it keeps it
  // while the page reloads.
  const refund = async (data: Record<string, unknown>) => {
    try {
      const response = await fetch(refundApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      window.location.reload();
    } catch (e) {
      toast.error(_('Something went wrong! Please try again.'));
    }
  };

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
                      form={form}
                      onSubmit={refund}
                      submitBtn={false}
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
                  // Validates, then refunds; a failed check or a refused
                  // refund ends the spinner so the user can correct and retry.
                  onAction: () => form.handleSubmit(refund)(),
                  variant: 'destructive'
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
