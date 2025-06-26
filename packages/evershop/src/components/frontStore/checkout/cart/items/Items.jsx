import { useAppDispatch } from '@components/common/context/app';
import ProductNoThumbnail from '@components/common/ProductNoThumbnail';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';
import { ItemOptions } from './ItemOptions';
import { ItemVariantOptions } from './ItemVariantOptions';
import './Items.scss';
import Quantity from './Quantity';

function Items({ items, setting: { priceIncludingTax } }) {
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
          {items.map((item) => (
            <tr key={item.cartItemId}>
              <td>
                <div className="flex justify-start space-x-4 product-info">
                  <div className="product-image flex justify-center items-center">
                    {item.thumbnail && (
                      <img
                        className="self-center"
                        src={item.thumbnail}
                        alt={item.productName}
                      />
                    )}
                    {!item.thumbnail && (
                      <ProductNoThumbnail width={40} height={40} />
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
                    <div className="mt-2">
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
                      {priceIncludingTax
                        ? item.productPriceInclTax.text
                        : item.productPrice.text}
                    </span>{' '}
                    <span className="sale-price">
                      {priceIncludingTax
                        ? item.finalPriceInclTax.text
                        : item.finalPrice.text}
                    </span>
                  </div>
                )}
                {item.finalPrice.value >= item.productPrice.value && (
                  <div>
                    <span className="sale-price">
                      {priceIncludingTax
                        ? item.finalPriceInclTax.text
                        : item.finalPrice.text}
                    </span>
                  </div>
                )}
                <div className="md:hidden mt-2 flex justify-end">
                  <Quantity qty={item.qty} api={item.updateQtyApi} />
                </div>
              </td>
              <td className="hidden md:table-cell">
                <Quantity qty={item.qty} api={item.updateQtyApi} />
              </td>
              <td className="hidden md:table-cell">
                <span>
                  {priceIncludingTax
                    ? item.lineTotalInclTax.text
                    : item.lineTotal.text}
                </span>
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
      finalPriceInclTax: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      productPrice: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      productPriceInclTax: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      qty: PropTypes.number,
      lineTotalInclTax: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      lineTotal: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      removeApi: PropTypes.string,
      updateQtyApi: PropTypes.string
    })
  ).isRequired,
  setting: PropTypes.shape({
    priceIncludingTax: PropTypes.bool
  }).isRequired
};

export default Items;
