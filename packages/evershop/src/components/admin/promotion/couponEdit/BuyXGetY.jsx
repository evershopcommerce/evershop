import PropTypes from 'prop-types';
import React from 'react';
import PubSub from 'pubsub-js';
import { Field } from '@components/common/form/Field';
import { FORM_FIELD_UPDATED } from '@evershop/evershop/src/lib/util/events';

export function BuyXGetY({ requireProducts, discountType }) {
  const [products, setProducts] = React.useState(requireProducts);
  const [active, setActive] = React.useState(() => {
    if (discountType === 'buy_x_get_y') {
      return true;
    } else {
      return false;
    }
  });

  React.useEffect(() => {
    const token = PubSub.subscribe(FORM_FIELD_UPDATED, (message, data) => {
      if (data.name === 'discount_type') {
        if (data.value === 'buy_x_get_y') {
          setActive(true);
        } else {
          setActive(false);
        }
      }
    });

    return function cleanup() {
      PubSub.unsubscribe(token);
    };
  }, []);

  const addProduct = (e) => {
    e.persist();
    e.preventDefault();
    setProducts(
      products.concat({
        sku: '',
        buy_qty: '',
        get_qty: '',
        max_y: '',
        discount: 100
      })
    );
  };

  const removeProduct = (e, index) => {
    e.persist();
    e.preventDefault();
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  if (active === true) {
    return (
      <div>
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>
                <span>Sku</span>
              </th>
              <th>
                <span>X</span>
              </th>
              <th>
                <span>Y</span>
              </th>
              <th>
                <span>Max of Y</span>
              </th>
              <th>
                <span>Discount percent</span>
              </th>
              <th> </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={p.sku}>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][sku]`}
                    value={p.sku}
                    validationRules={['notEmpty']}
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][buy_qty]`}
                    value={p.buyQty}
                    validationRules={['notEmpty', 'number']}
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][get_qty]`}
                    value={p.getQty}
                    validationRules={['notEmpty', 'number']}
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][max_y]`}
                    value={p.maxY}
                    validationRules={['notEmpty', 'number']}
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][discount]`}
                    value={p.discount}
                    validationRules={['notEmpty']}
                  />
                </td>
                <td>
                  <a
                    className="text-critical"
                    href="#"
                    onClick={(e) => removeProduct(e, i)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="1.5rem"
                      height="1.5rem"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18 12H6"
                      />
                    </svg>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-1 flex justify-start">
          <div className="items-center flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.5rem"
              height="1.5rem"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <div className="pl-1">
            <a href="#" onClick={(e) => addProduct(e)}>
              <span>Add product</span>
            </a>
          </div>
        </div>
      </div>
    );
  } else {
    return null;
  }
}

BuyXGetY.propTypes = {
  requireProducts: PropTypes.arrayOf(
    PropTypes.shape({
      sku: PropTypes.string,
      buyQty: PropTypes.string,
      getQty: PropTypes.string,
      maxY: PropTypes.string,
      discount: PropTypes.string
    })
  ),
  discountType: PropTypes.string.isRequired
};

BuyXGetY.defaultProps = {
  requireProducts: []
};
