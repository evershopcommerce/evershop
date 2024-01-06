import React from 'react';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export default function Error() {
  return (
    <div className="text-center">
       <h1>{_('Error')}</h1>
      <p>
        {_('We are sorry. There was an error processing your payment. Your card was not charged. Please try again.')}
      </p>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
