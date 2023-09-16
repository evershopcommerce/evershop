import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useAppDispatch } from '@components/common/context/app';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import { ItemOptions } from './ItemOptions';
import { ItemVariantOptions } from './ItemVariantOptions';
import './Items.scss';

function Items({ items }) {
  const AppContextDispatch = useAppDispatch();

  const removeItem = async (item) => {
    const response = await fetch(item.removeApi, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const currentUrl = window.location.href;
      const url = new URL(currentUrl, window.location.origin);
      url.searchParams.set('ajax', true);
      await AppContextDispatch.fetchPageData(url);
    } else {
      // TODO: display message
      const data = await response.json();
      toast(data.error.message);
    }
  };

  return (
    <div id="shopping-cart-items">
      <table className="items-table listing">
        <thead>
          <tr>
            <td>
              <span>{_('Product')}</span>
            </td>
            <td>
              <span>{_('Price')}</span>
            </td>
            <td className="hidden md:table-cell">
              <span>{_('Quantity')}</span>
            </td>
            <td className="hidden md:table-cell">
              <span>{_('Total')}</span>
            </td>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index}>
              <td>
                <div className="flex justify-start space-x-1 product-info">
                  <div className="flex justify-center">
                    {item.thumbnail && (
                      <img
                        className="self-center"
                        src={item.thumbnail}
                        alt={item.productName}
                      />
                    )}
                    {!item.thumbnail && (
                      <svg
                        className="self-center"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="cart-tem-info">
                    <a
                      href={item.productUrl}
                      className="name font-semibold hover:underline"
                    >
                      {item.productName}
                    </a>
                    {item.errors.map((e, i) => (
                      <div className="text-critical" key={i}>
                        {e}
                      </div>
                    ))}
                    <ItemOptions
                      options={JSON.parse(item.productCustomOptions || '[]')}
                    />
                    <ItemVariantOptions
                      options={JSON.parse(item.variantOptions || '[]')}
                    />
                    <div className="mt-05">
                      <a
                        onClick={async (e) => {
                          e.preventDefault();
                          await removeItem(item);
                        }}
                        href="#"
                        className="text-textSubdued underline"
                      >
                        <span>{_('Remove')}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                {item.finalPrice.value < item.productPrice.value && (
                  <div>
                    <span className="regular-price">
                      {item.productPrice.text}
                    </span>{' '}
                    <span className="sale-price">{item.finalPrice.text}</span>
                  </div>
                )}
                {item.finalPrice.value >= item.productPrice.value && (
                  <div>
                    <span className="sale-price">{item.finalPrice.text}</span>
                  </div>
                )}
                <div className="md:hidden mt-05">
                  <span>{_('Qty')}</span>
                  <span>{item.qty}</span>
                </div>
              </td>
              <td className="hidden md:table-cell">
                <span>{item.qty}</span>
              </td>
              <td className="hidden md:table-cell">
                <span>{item.total.text}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Items.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      thumbnail: PropTypes.string,
      productName: PropTypes.string,
      productUrl: PropTypes.string,
      productCustomOptions: PropTypes.string,
      variantOptions: PropTypes.string,
      finalPrice: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      productPrice: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      qty: PropTypes.number,
      total: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      removeApi: PropTypes.string
    })
  ).isRequired
};

export default Items;
