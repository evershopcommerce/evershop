import React from 'react';

export default function Order({ order }) {
  return <div className='order'>
    <div className='order-inner'>
      <div className='order-header flex justify-between items-center'>
        <div className='order-number'>Order #{order.id}</div>
        <div className='order-date'>{order.createdAt}</div>
      </div>
      <div className='order-items'>
        {order.items.map((item) => <div className='order-item flex justify-between items-center'>
          <div className='order-item-name'>{item.productName}</div>
          <div className='order-item-quantity'>{item.qty}</div>
        </div>)}
      </div>
      <div className='order-total flex justify-between items-center'>
        <div className='order-total-label'>Total</div>
        <div className='order-total-value'>{order.grandTotal.text}</div>
      </div>
    </div>
  </div>
}