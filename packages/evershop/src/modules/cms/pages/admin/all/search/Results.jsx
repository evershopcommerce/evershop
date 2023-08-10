import PropTypes from 'prop-types';
import React from 'react';

export function Results({ keyword, results = {} }) {
  const { customers = [], products = [], orders = [] } = results;

  return (
    <div className="results">
      <h3>
        Results for &quot;
        {keyword}
        &quot;
      </h3>
      <div className="item-list">
        {products.items.length > 0 && (
          <div className="item-category flex flex-col space-x-1">
            <div className="result-category">Products</div>
            {products.items.map((product, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <a href={product.url} key={index}>
                <div className="font-bold">{product.name}</div>
                <div>#{product.sku}</div>
              </a>
            ))}
          </div>
        )}
        {customers.items.length > 0 && (
          <div className="item-category flex flex-col space-x-1">
            <div className="result-category">Customers</div>
            {customers.items.map((customer, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <a href={customer.url} key={index}>
                <div className="font-bold">{customer.fullName}</div>
                <div>{customer.email}</div>
              </a>
            ))}
          </div>
        )}
        {orders.items.length > 0 && (
          <div className="item-category flex flex-col space-x-1">
            <div className="result-category">Orders</div>
            {orders.items.map((order, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <a href={order.url} key={index}>
                <div className="font-bold">#{order.orderNumber}</div>
                <div>{order.email}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Results.propTypes = {
  keyword: PropTypes.string,
  results: PropTypes.arrayOf(
    PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          name: PropTypes.string,
          description: PropTypes.string
        })
      )
    })
  )
};

Results.defaultProps = {
  keyword: undefined,
  results: []
};
