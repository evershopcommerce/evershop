import { Area } from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ShoppingBag } from 'lucide-react';
import React from 'react';

export const DefaultMiniCartDropdownEmpty: React.FC<{
  setIsDropdownOpen: (isOpen: boolean) => void;
}> = ({ setIsDropdownOpen }) => (
  <div className="minicart__empty p-8 text-center">
    <Area id="miniCartEmptyBefore" noOuter />
    <ShoppingBag
      width={48}
      height={48}
      className="mx-auto text-muted-foreground mb-4"
    />
    <p className="text-muted-foreground mb-4">{_('Your cart is empty')}</p>
    <Button
      variant="default"
      onClick={() => setIsDropdownOpen(false)}
      size={'lg'}
    >
      {_('Continue Shopping')}
    </Button>
    <Area id="miniCartEmptyAfter" noOuter />
  </div>
);
