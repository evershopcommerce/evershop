import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { useAppDispatch } from '@components/common/context/app';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import ProductNoThumbnail from '@components/common/ProductNoThumbnail';
import { ItemOptions } from './ItemOptions';
import { ItemVariantOptions } from './ItemVariantOptions';
import './Items.scss';

function Items({ items, setting: { displayCheckoutPriceIncludeTax } }) {
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
                      {displayCheckoutPriceIncludeTax
                        ? item.productPriceInclTax.text
                        : item.productPrice.text}
                    </span>{' '}
                    <span className="sale-price">
                      {displayCheckoutPriceIncludeTax
                        ? item.finalPriceInclTax.text
                        : item.finalPrice.text}
                    </span>
                  </div>
                )}
                {item.finalPrice.value >= item.productPrice.value && (
                  <div>
                    <span className="sale-price">
                      {displayCheckoutPriceIncludeTax
                        ? item.finalPriceInclTax.text
                        : item.finalPrice.text}
                    </span>
                  </div>
                )}
                <div className="md:hidden mt-2">
                  <span>{_('Qty')}</span>
                  <span>{item.qty}</span>
                </div>
              </td>
              <td className="hidden md:table-cell">
                <span>{item.qty}</span>
              </td>
              <td className="hidden md:table-cell">
                <span>
                  {displayCheckoutPriceIncludeTax
                    ? item.total.text
                    : item.subTotal.text}
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
      total: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      subTotal: PropTypes.shape({
        value: PropTypes.number,
        text: PropTypes.string
      }),
      removeApi: PropTypes.string
    })
  ).isRequired,
  setting: PropTypes.shape({
    displayCheckoutPriceIncludeTax: PropTypes.bool
  }).isRequired
};

export default Items;
