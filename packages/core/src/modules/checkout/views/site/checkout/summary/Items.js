import PropTypes from "prop-types"
import React from 'react';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import './Items.scss';

function ItemOptions({ options = [] }) {
  if (options.length === 0) { return null; }
  const currency = get(useAppState(), 'currency', 'USD');
  const language = get(useAppState(), 'language', 'en');

  return (
    <div className="cart-item-options mt-05">
      <ul className="list-basic">
        {options.map((o, i) => (
          <li key={i}>
            <span className="option-name">
              {o.option_name}
              :
              {' '}
            </span>
            {o.values.map((v, k) => {
              const _extraPrice = new Intl.NumberFormat(language, { style: 'currency', currency }).format(v.extra_price);
              return (
                <span key={k}>
                  {v.value_text}
                  <span className="extra-price">
                    (
                    {_extraPrice}
                    )
                  </span>
                  {' '}

                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemVariantOptions({ options = [] }) {
  if (!Array.isArray(options) || !options || options.length === 0) { return null; }

  return (
    <div className="cart-item-variant-options mt-05">
      <ul>
        {options.map((o, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={i}>
            <span className="attribute-name">
              {o.attribute_name}
              :
              {' '}
            </span>
            <span>{o.option_text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

ItemVariantOptions.propTypes = {
  options: PropTypes.array
}

function Items() {
  const context = useAppState();
  const currency = get(context, 'currency', 'USD');
  const language = get(context, 'language', 'en');
  const items = get(context, 'cart.items', []);

  return (
    <div id="summary-items">
      <table className="listing items-table">
        <tbody>
          {
            items.map((item, index) => {
              const formatedTotal = new Intl.NumberFormat(language, { style: 'currency', currency }).format(item.total);

              return (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={index}>
                  <td>
                    <div className="product-thumbnail">
                      <div className="thumbnail">
                        {item.thumbnail && <img src={item.thumbnail} alt={item.product_name} />}
                        {!item.thumbnail && <svg style={{ width: '2rem' }} fill="currentcolor" viewBox="0 0 20 20" focusable="false" aria-hidden="true"><path fillRule="evenodd" d="M6 11h8V9H6v2zm0 4h8v-2H6v2zm0-8h4V5H6v2zm6-5H5.5A1.5 1.5 0 0 0 4 3.5v13A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V6l-4-4z" /></svg>}
                      </div>
                      <span className="qty">{item.qty}</span>
                    </div>
                  </td>
                  <td>
                    <div className="product-column">
                      <div><span className="font-semibold">{item.product_name}</span></div>
                      <ItemVariantOptions options={JSON.parse(item.variant_options)} />
                    </div>
                  </td>
                  <td><span>{formatedTotal}</span></td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  );
}

export { Items };
