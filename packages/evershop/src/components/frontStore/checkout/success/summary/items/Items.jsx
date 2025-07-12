import { ItemVariantOptions } from '@components/frontStore/checkout/cart/items/ItemVariantOptions';
import PropTypes from 'prop-types';
import React from 'react';
import './Items.scss';
import ProductNoThumbnail from '@components/common/ProductNoThumbnail';

function Items({ items, priceIncludingTax }) {
  return (
    <div id="summary-items">
      <table className="listing items-table">
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <div className="product-thumbnail">
                  <div className="thumbnail">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.productName} />
                    )}
                    {!item.thumbnail && (
                      <ProductNoThumbnail width={45} height={45} />
                    )}
                  </div>
                  <span className="qty">{item.qty}</span>
                </div>
              </td>
              <td>
                <div className="product-column">
                  <div>
                    <span className="font-semibold">{item.productName}</span>
                  </div>
                  <ItemVariantOptions
                    options={JSON.parse(item.variantOptions || '[]')}
                  />
                </div>
              </td>
              <td>
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
      productName: PropTypes.string.isRequired,
      qty: PropTypes.number.isRequired,
      thumbnail: PropTypes.string,
      lineTotalInclTax: PropTypes.shape({
        text: PropTypes.string.isRequired
      }).isRequired,
      lineTotal: PropTypes.shape({
        text: PropTypes.string.isRequired
      }).isRequired,
      variantOptions: PropTypes.string
    })
  ).isRequired,
  priceIncludingTax: PropTypes.bool.isRequired
};

export { Items };
