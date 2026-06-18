import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { Textarea } from '@components/common/ui/Textarea.js';
import { useCartState } from '@components/frontStore/cart/CartContext.js';
import { useCheckoutDispatch } from '@components/frontStore/checkout/CheckoutContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { NotebookPen } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export function ShippingNote() {
  const { updateCheckoutData } = useCheckoutDispatch();
  const { data: cart } = useCartState();
  const [note, setNote] = useState(cart?.shippingNote ?? '');

  // This component lives outside the checkout <Form>, so it is NOT a
  // react-hook-form field — using TextareaField here throws because
  // useFormContext() is null. The note reaches the order purely through
  // checkoutData: the unified checkout POST sends `checkoutData`, and the
  // server's checkout service reads `data.note` and persists it as the cart's
  // `shipping_note` field.
  useEffect(() => {
    updateCheckoutData({ note });
  }, [note]);

  return (
    <div className="checkout-shipping-note mb-5">
      <Card>
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
            onChange={(e) => setNote(e.target.value)}
            placeholder={_('Add a note to your order')}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
