import React from 'react';

interface ShippingNoteProps {
  setting: {
    showShippingNote: boolean;
  };
  order: {
    shippingNote: string;
  };
}

export default function ShippingNote({
  setting: { showShippingNote },
  order: { shippingNote }
}: ShippingNoteProps) {
  return showShippingNote ? (
    <div className="shipping-note mt-5">
      <p className="italic">{shippingNote}</p>
    </div>
  ) : null;
}

export const layout = {
  areaId: 'checkoutSuccessSummary',
  sortOrder: 50
};

export const query = `
  query Query {
    order (uuid: getContextValue('orderId')) {
      shippingNote
    }
    setting {
      showShippingNote
    }
  }
`;
