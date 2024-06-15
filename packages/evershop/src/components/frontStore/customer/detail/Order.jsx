import { _ } from '@evershop/evershop/src/lib/locale/translate';
import PropTypes from 'prop-types';
import React from 'react';
import ProductNoThumbnail from '@components/common/ProductNoThumbnail';

export default function Order({ order }) {
  return (
    <div className="order border-divider">
      <div className="order-inner grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="order-items col-span-2">
          {order.items.map((item) => (
            <div className="order-item mb-4 flex gap-8 items-center">
              <div className="thumbnail border border-divider p-4 rounded">
                {item.thumbnail && (
                  <img
                    style={{ maxWidth: '6rem' }}
                    src={item.thumbnail}
                    alt={item.productName}
                  />
                )}
                {!item.thumbnail && (
                  <ProductNoThumbnail width={100} height={100} />
                )}
              </div>
              <div className="order-item-info">
                <div className="order-item-name font-semibold">
                  {item.productName}
                </div>
                <div className="order-item-sku italic">
                  {_('Sku')}: #{item.productSku}
                </div>
                <div className="order-item-qty" style={{ fontSize: '0.9em' }}>
                  {item.qty} x {item.productPrice.text}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="order-total col-span-1">
          <div className="order-header">
            <div className="order-number">
              <span className="font-bold">
                {_('Order')}: #{order.orderNumber}
              </span>
              <span className="italic pl-4">{order.createdAt.text}</span>
            </div>
          </div>
          <div className="order-total-value font-bold">
            {_('Total')}:{order.grandTotal.text}
          </div>
        </div>
      </div>
    </div>
  );
}

Order.propTypes = {
  order: PropTypes.shape({
    createdAt: PropTypes.shape({
      text: PropTypes.string.isRequired
    }),
    grandTotal: PropTypes.shape({
      text: PropTypes.string.isRequired
    }),
    items: PropTypes.arrayOf(
      PropTypes.shape({
        productPrice: PropTypes.shape({
          text: PropTypes.string.isRequired
        }),
        productSku: PropTypes.string.isRequired,
        productName: PropTypes.string.isRequired,
        thumbnail: PropTypes.string,
        qty: PropTypes.number.isRequired
      })
    ),
    orderNumber: PropTypes.string.isRequired
  }).isRequired
};
