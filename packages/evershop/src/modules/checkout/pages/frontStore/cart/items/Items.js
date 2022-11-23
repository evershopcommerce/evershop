import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { ItemOptions } from './ItemOptions';
import { ItemVariantOptions } from './ItemVariantOptions';
import './Items.scss';

function Items({ items, removeUrl, cartId }) {
  const removeItem = async (id) => {
    const response = await axios.delete(removeUrl, { data: { cartId, itemId: id } });
    if (response.data.success === true) {
      location.reload();
    } else {
      // TODO: display message
      toast(response.data.message);
    }
  };

  return (
    <div id="shopping-cart-items">
      <table className="items-table listing">
        <thead>
          <tr>
            <td><span>Product</span></td>
            <td><span>Price</span></td>
            <td className="hidden md:table-cell"><span>Quantity</span></td>
            <td className="hidden md:table-cell"><span>Total</span></td>
          </tr>
        </thead>
        <tbody>
          {
            items.map((item, index) => {
              return (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={index}>
                  <td>
                    <div className="flex justify-start space-x-1 product-info">
                      <div className="flex justify-center">
                        {item.thumbnail && <img className="self-center" src={item.thumbnail} alt={item.productName} />}
                        {!item.thumbnail && (
                          <svg className="self-center" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="cart-tem-info">
                        <a href={item.productUrl} className="name font-semibold hover:underline">{item.productName}</a>
                        {// TODO: item errors
                          // eslint-disable-next-line react/no-array-index-key
                          [].map((e, i) => <div className="text-critical" key={i}>{e.message}</div>)
                        }
                        <ItemOptions options={JSON.parse(item.productCustomOptions || '[]')} />
                        <ItemVariantOptions options={JSON.parse(item.variantOptions || '[]')} />
                        <div className="mt-05">
                          <a
                            onClick={async (e) => {
                              e.preventDefault();
                              await removeItem(item.cartItemId);
                            }}
                            href="#"
                            className="text-textSubdued underline"
                          >
                            <span>Remove</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {item.finalPrice.value < item.productPrice.value && (
                      <div>
                        <span className="regular-price">{item.productPrice.text}</span>
                        {' '}
                        <span className="sale-price">{item.finalPrice.text}</span>
                      </div>
                    )}
                    {item.finalPrice.value >= item.productPrice.value && (
                      <div>
                        <span className="sale-price">{item.finalPrice.text}</span>
                      </div>
                    )}
                    <div className="md:hidden mt-05">
                      <span>Qty</span>
                      <span>{item.qty}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell"><span>{item.qty}</span></td>
                  <td className="hidden md:table-cell"><span>{item.total.text}</span></td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  );
}

export default Items;
