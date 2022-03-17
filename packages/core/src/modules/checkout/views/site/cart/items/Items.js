import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { useAppState } from '../../../../../../lib/context/app';
import { ItemOptions } from './ItemOptions';
import { ItemVariantOptions } from './ItemVariantOptions';

const { get } = require('../../../../../../lib/util/get');

function Items() {
  const context = useAppState();
  const items = get(context, 'cart.items', []);
  const currency = get(context, 'currency', 'USD');
  const language = get(context, 'language', 'en');
  const currentUrl = get(context, 'currentUrl');

  const removeItem = async (API) => {
    const response = await axios.get(API);
    if (response.data.success === true) {
      window.location.href = currentUrl;
    } else {
      // TODO: display message
      toast(response.data.message);
    }
  };

  if (items.length === 0) { return null; } else {
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
                const formatedRegularPrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(item.product_price);
                const formatedFinalPrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(item.final_price);
                const formatedTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(item.total);
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={index}>
                    <td>
                      <div className="flex justify-start space-x-1 product-info">
                        <div className="flex justify-center">
                          {item.thumbnail && <img className="self-center" src={item.thumbnail} alt={item.product_name} />}
                          {!item.thumbnail && (
                            <svg className="self-center" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="cart-tem-info">
                          <a href={item.productUrl} className="name font-semibold hover:underline">{item.product_name}</a>
                          {// TODO: item errors
                            // eslint-disable-next-line react/no-array-index-key
                            [].map((e, i) => <div className="text-critical" key={i}>{e.message}</div>)
                          }
                          <ItemOptions options={item.options} />
                          <ItemVariantOptions options={JSON.parse(item.variant_options)} />
                          <div className="mt-05">
                            <a
                              onClick={async (e) => {
                                e.preventDefault();
                                await removeItem(item.removeUrl);
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
                      {parseFloat(item.final_price) < parseFloat(item.product_price) && (
                        <div>
                          <span className="regular-price">{formatedRegularPrice}</span>
                          {' '}
                          <span className="sale-price">{formatedFinalPrice}</span>
                        </div>
                      )}
                      {parseFloat(item.final_price) >= parseFloat(item.product_price) && (
                        <div>
                          <span className="sale-price">{formatedFinalPrice}</span>
                        </div>
                      )}
                      <div className="md:hidden mt-05">
                        <span>Qty</span>
                        <span>{item.qty}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell"><span>{item.qty}</span></td>
                    <td className="hidden md:table-cell"><span>{formatedTotal}</span></td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    );
  }
}

export default Items;
