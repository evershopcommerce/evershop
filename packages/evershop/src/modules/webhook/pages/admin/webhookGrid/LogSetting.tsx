import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface LogSettingProps {
  saveSettingApi: string;
  webhookLogLimit: number;
}

export default function LogSetting({
  saveSettingApi,
  webhookLogLimit
}: LogSettingProps) {
  return (
    <div className="w-2/3 mx-auto">
    <Card className="mt-5">
      <CardHeader>
        <CardTitle>{_('Delivery log')}</CardTitle>
        <CardDescription>
          {_(
            'Every delivery is logged, successful or not. This number is how many completed (delivered or canceled) deliveries are kept per webhook; older ones are deleted. Failed deliveries are kept for 30 days, and deliveries still waiting to be sent are never deleted.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          id="webhookLogForm"
          method="POST"
          action={saveSettingApi}
          successMessage={_('Delivery log setting saved')}
        >
          <InputField
            name="webhookLogLimit"
            type="number"
            label={_('Deliveries to keep per webhook')}
            defaultValue={webhookLogLimit}
            placeholder="100"
            helperText={_('Between 10 and 1000.')}
            validation={{
              required: _('This field is required'),
              min: { value: 10, message: _('Must be at least 10') },
              max: { value: 1000, message: _('Must be at most 1000') }
            }}
          />
        </Form>
      </CardContent>
    </Card>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 30
};

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
    webhookLogLimit
  }
`;
