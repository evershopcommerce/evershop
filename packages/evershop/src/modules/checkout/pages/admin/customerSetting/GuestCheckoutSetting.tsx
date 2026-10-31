import { ToggleField } from '@components/common/form/ToggleField.js';
import { CardContent, CardTitle } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * The "Checkout" section of Settings → Customer (it used to be on Store
 * Settings). Rendered into the page's `customerSettingSections` Area, so the
 * toggle posts with the page form through the generic `saveSetting` upsert.
 * `getAllowGuestCheckout` (services/checkoutSettings.ts) reads the row.
 */
interface GuestCheckoutSettingProps {
  setting: {
    allowGuestCheckout?: boolean | null;
  };
}

export default function GuestCheckoutSetting({
  setting: { allowGuestCheckout }
}: GuestCheckoutSettingProps) {
  return (
    <CardContent className="pt-3 border-t border-border">
      <CardTitle>{_('Checkout')}</CardTitle>
      <div className="mt-4">
        <ToggleField
          name="allowGuestCheckout"
          label={_('Allow guest checkout')}
          defaultValue={allowGuestCheckout ?? true}
          helperText={_(
            'When enabled, shoppers can place an order without an account. When disabled, they must log in or register to check out.'
          )}
        />
      </div>
    </CardContent>
  );
}

export const layout = {
  areaId: 'customerSettingSections',
  sortOrder: 5
};

export const query = `
  query Query {
    setting {
      allowGuestCheckout
    }
  }
`;
