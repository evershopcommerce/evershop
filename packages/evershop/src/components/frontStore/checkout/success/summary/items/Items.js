import PropTypes from 'prop-types';
import React from 'react';
import { ItemVariantOptions } from '@components/frontStore/checkout/cart/items/ItemVariantOptions';
import './Items.scss';

function Items({ items }) {
  return (
    <div id="summary-items">
      <table className="listing items-table">
        <tbody>
          {items.map((item, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index}>
              <td>
                <div className="product-thumbnail">
                  <div className="thumbnail">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.productName} />
                    )}
                    {!item.thumbnail && (
                      <svg
                        style={{ width: '2rem' }}
                        fill="currentcolor"
                        viewBox="0 0 20 20"
                        focusable="false"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6 11h8V9H6v2zm0 4h8v-2H6v2zm0-8h4V5H6v2zm6-5H5.5A1.5 1.5 0 0 0 4 3.5v13A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V6l-4-4z"
                        />
                      </svg>
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
      id: PropTypes.string.isRequired,
      productName: PropTypes.string.isRequired,
      qty: PropTypes.number.isRequired,
      thumbnail: PropTypes.string,
      total: PropTypes.shape({
        text: PropTypes.string.isRequired
      }).isRequired,
      variantOptions: PropTypes.string
    })
  ).isRequired
};

export { Items };
