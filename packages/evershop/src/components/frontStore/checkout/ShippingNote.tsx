import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { Textarea } from '@components/common/ui/Textarea.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import {
  useCheckout,
  useCheckoutDispatch
} from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { NotebookPen } from 'lucide-react';
import React from 'react';

export function ShippingNote() {
  const { checkoutData } = useCheckout();
  const { updateCheckoutData } = useCheckoutDispatch();
  const { data: cart } = useCartState();

  // This component is not a react-hook-form field — it lives outside the
  // checkout <Form>, so useFormContext() is null there. The note reaches the
  // order purely through checkoutData: the unified checkout POST sends
  // `checkoutData`, and the server's checkout service reads `data.note` and
  // persists it as the cart's `shipping_note` field.
  //
  // The value is controlled from checkoutData (not local state) because the
  // checkout page renders one instance per breakpoint (form column on mobile,
  // summary rail on desktop) — both must edit the same note. Until the
  // customer types, fall back to the note persisted on the cart; when `note`
  // is undefined at submit the server keeps the cart's stored note, so what
  // is displayed and what is ordered always agree.
  const note = checkoutData.note ?? cart?.shippingNote ?? '';

  return (
    <div className="checkout-shipping-note">
      <Card className="rounded-lg border border-border shadow-none ring-0">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <NotebookPen className="w-5 h-5" />
              <span>{_('Order Note')}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(e) => updateCheckoutData({ note: e.target.value })}
            placeholder={_('Add a note to your order')}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
