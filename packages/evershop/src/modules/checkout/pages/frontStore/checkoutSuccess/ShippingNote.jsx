import PropTypes from 'prop-types';
import React from 'react';


export default function ShippingNote({
  setting: { showShippingNote },
  order: { shippingNote }
}) {
  return showShippingNote ? (
    <div className="shipping-note mt-8">
      <p className="italic">{shippingNote}</p>
    </div>
  ) : null;
}

ShippingNote.propTypes = {
  setting: PropTypes.shape({
    showShippingNote: PropTypes.bool
  }),
  order: PropTypes.shape({
    shippingNote: PropTypes.string
  })
};

ShippingNote.defaultProps = {
  setting: {
    showShippingNote: false
  },
  order: {
    shippingNote: ''
  }
};

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
