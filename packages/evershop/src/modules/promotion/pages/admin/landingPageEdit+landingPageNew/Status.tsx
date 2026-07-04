import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface LandingPageStatusProps {
  landingPage?: {
    status?: boolean;
  };
}

export default function Status({ landingPage }: LandingPageStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Status')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/*
          The `status` column is a BOOLEAN. RadioOption values are typed
          `string | number`, so the field submits 1/0 and the landing-page
          service normalizes it back to a boolean (1/'1'/true -> true).
        */}
        <RadioGroupField
          name="status"
          options={[
            { value: 1, label: _('Enabled') },
            { value: 0, label: _('Disabled') }
          ]}
          defaultValue={landingPage?.status === false ? 0 : 1}
          required
          helperText={_(
            'Enable this landing page to make it visible on the storefront.'
          )}
        />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    landingPage(id: getContextValue("landingPageId", null)) {
      status
    }
  }
`;
