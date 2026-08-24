import { SettingMenu } from '@components/admin/SettingMenu.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useQuery } from 'urql';

const CASHBACK_SETTING_QUERY = `
  query CashbackSettingAdminQuery {
    cashbackSetting {
      enabled
      percentage
      minOrderAmount
    }
  }
`;

export default function CashbackSettingPage() {
  const [result] = useQuery({ query: CASHBACK_SETTING_QUERY });
  const { data, fetching } = result;

  const initialValues = {
    cashback_enabled: data?.cashbackSetting?.enabled ? 1 : 0,
    cashback_percentage: data?.cashbackSetting?.percentage ?? 5,
    cashback_min_order_amount: data?.cashbackSetting?.minOrderAmount ?? 0
  };

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch('/api/setting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        toast.success(_('Cashback settings updated successfully!'));
      } else {
        toast.error(_('Failed to update settings.'));
      }
    } catch (e: any) {
      toast.error(e?.message || _('Error saving cashback settings.'));
    }
  };

  return (
    <div className="flex gap-8">
      <div className="w-1/4">
        <SettingMenu active="cashback" />
      </div>

      <div className="w-3/4 space-y-6">
        <Form
          id="cashback-setting-form"
          action="/api/setting"
          method="POST"
          isOmitContainer
          onSuccess={() => toast.success(_('Cashback settings saved!'))}
        >
          <Card>
            <CardHeader>
              <CardTitle>{_('Cashback & Rebate Configuration')}</CardTitle>
              <CardDescription>
                {_('Configure automated cashback percentage earned by customers when placing orders.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fetching ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ) : (
                <>
                  <ToggleField
                    name="cashback_enabled"
                    label={_('Enable Cashback Program')}
                    description={_('When enabled, qualifying purchases credit customer accounts with cashback store balance.')}
                    defaultValue={initialValues.cashback_enabled === 1}
                  />

                  <InputField
                    name="cashback_percentage"
                    label={_('Cashback Percentage (%)')}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="5.0"
                    defaultValue={String(initialValues.cashback_percentage)}
                    helperText={_('The percentage of order subtotal credited back as cashback.')}
                  />

                  <InputField
                    name="cashback_min_order_amount"
                    label={_('Minimum Order Subtotal ($)')}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    defaultValue={String(initialValues.cashback_min_order_amount)}
                    helperText={_('Minimum subtotal required to qualify for cashback (set to 0 for no minimum).')}
                  />
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border pt-4">
              <Button type="submit">
                {_('Save Settings')}
              </Button>
            </CardFooter>
          </Card>
        </Form>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
