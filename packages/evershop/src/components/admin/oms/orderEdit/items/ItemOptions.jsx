import PropTypes from 'prop-types';
import React from 'react';


export function ItemOptions({ options = [] }) {
  if (options.length === 0) {
    return null;
  }
  const currency = '';

  return (
    <div className="cart-item-options">
      <ul className="list-unstyled">
        {options.map((o, i) => (
          <li key={i}>
            <span className="option-name">
              <strong>{o.option_name} : </strong>
            </span>
            {o.values.map((v, k) => {
              const formatedExtraPrice = new Intl.NumberFormat('en', {
                style: 'currency',
                currency
              }).format(v.extra_price);
              return (
                <span key={k}>
                  <i className="value-text">{v.value_text}</i>
                  <span className="extra-price">
                    ({formatedExtraPrice})
                  </span>{' '}
                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

ItemOptions.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      option_name: PropTypes.string,
      values: PropTypes.arrayOf(
        PropTypes.shape({
          value_text: PropTypes.string,
          extra_price: PropTypes.number
        })
      )
    })
  ).isRequired
};
