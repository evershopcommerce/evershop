import React from 'react';

export default function Order({ order }) {
  return (
    <div className="order border-divider">
      <div className="order-inner grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="order-items col-span-2">
          {order.items.map((item) => (
            <div className="order-item mb-1 flex gap-2 items-center">
              <div className="thumbnail border border-divider p-1 rounded">
                {item.thumbnail && <img style={{ maxWidth: '6rem' }} src={item.thumbnail} alt={item.productName} />}
                {!item.thumbnail && <svg style={{ width: '2rem' }} fill="currentcolor" viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path fillRule="evenodd" d="M6 11h8V9H6v2zm0 4h8v-2H6v2zm0-8h4V5H6v2zm6-5H5.5A1.5 1.5 0 0 0 4 3.5v13A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V6l-4-4z" /></svg>}
              </div>
              <div className="order-item-info">
                <div className="order-item-name font-semibold">{item.productName}</div>
                <div className="order-item-sku italic">
                  Sku: #
                  {item.productSku}
                </div>
                <div className="order-item-qty" style={{ fontSize: '0.9em' }}>
                  {item.qty}
                  {' '}
                  x
                  {' '}
                  {item.productPrice.text}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="order-total col-span-1">
          <div className="order-header">
            <div className="order-number">
              <span className="font-bold">
                Order: #
                {order.orderNumber}
              </span>
              <span className="italic pl-1">{order.createdAt.text}</span>
            </div>
          </div>
          <div className="order-total-value font-bold">
            Total:
            {order.grandTotal.text}
          </div>
        </div>
      </div>
    </div>
  );
}
