import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function Error() {
  return (
    <div className="text-center">
      <h1>{_('Error')}</h1>
      <p>
        {_(
          'We are sorry. There was a problem completing your payment. If you approved the payment at PayPal, please do not try again — contact us and we will confirm your payment status.'
        )}
      </p>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
