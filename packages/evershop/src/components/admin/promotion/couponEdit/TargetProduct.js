import PropTypes from 'prop-types';
import React from 'react';
import PubSub from 'pubsub-js';
import Area from '@components/common/Area';
import { Input } from '@components/common/form/fields/Input';
import { FORM_FIELD_UPDATED } from '@evershop/evershop/src/lib/util/events';

function Products({ targetProducts, maxQty = '' }) {
  const [products, setProducts] = React.useState(targetProducts);

  const addProduct = (e) => {
    e.persist();
    e.preventDefault();
    setProducts(
      products.concat({
        key: 'category',
        operator: '',
        value: '',
        qty: ''
      })
    );
  };

  const removeProduct = (e, index) => {
    e.persist();
    e.preventDefault();
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  const updateProduct = (e, key, index) => {
    e.persist();
    e.preventDefault();
    const newProducts = products.map((p, i) => {
      if (i === index) {
        return { ...p, [key]: e.target.value };
      } else {
        return p;
      }
    });
    setProducts(newProducts);
  };

  return (
    <div>
      <div className="mb-1 mt-1">
        <div className="flex justify-start items-center mb-3">
          <div>Maximum</div>
          <div style={{ width: '70px', padding: '0 1rem' }}>
            <Input name="target_products[maxQty]" value={maxQty} />
          </div>
          <div>quantity of products are matched bellow conditions(All)</div>
        </div>
      </div>
      <table className="table table-bordered" style={{ marginTop: 0 }}>
        <thead>
          <tr>
            <th>
              <span>Key</span>
            </th>
            <th>
              <span>Operator</span>
            </th>
            <th>
              <span>Value</span>
            </th>
            <th> </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i}>
              <td>
                <div className="form-field-container dropdown">
                  <div className="field-wrapper">
                    <select
                      name={`target_products[products][${i}][key]`}
                      className="form-control"
                      value={p.key}
                      onChange={(e) => updateProduct(e, 'key', i)}
                    >
                      <Area
                        id="couponTargetProductKeyList"
                        noOuter
                        coreComponents={[
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: () => (
                                <option value="category">Category</option>
                              )
                            },
                            props: {},
                            sortOrder: 10
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: () => (
                                <option value="attribute_group">
                                  Attribute Group
                                </option>
                              )
                            },
                            props: {},
                            sortOrder: 20
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: () => (
                                <option value="price">Price</option>
                              )
                            },
                            props: {},
                            sortOrder: 30
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: () => <option value="sku">Sku</option>
                            },
                            props: {},
                            sortOrder: 40
                          }
                        ]}
                      />
                    </select>
                    <div className="field-border" />
                    <div className="field-suffix">
                      <svg
                        viewBox="0 0 20 20"
                        width="1rem"
                        height="1.25rem"
                        focusable="false"
                        aria-hidden="true"
                      >
                        <path d="m10 16-4-4h8l-4 4zm0-12 4 4H6l4-4z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div className="form-field-container dropdown">
                  <div className="field-wrapper">
                    <select
                      name={`target_products[products][${i}][operator]`}
                      className="form-control"
                      value={p.operator}
                      onChange={(e) => updateProduct(e, 'operator', i)}
                    >
                      <Area
                        id="couponTargetProductOperatorList"
                        noOuter
                        coreComponents={[
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: ({ compareKey }) =>
                                ['price'].includes(compareKey) ? (
                                  <option value="=">Equal</option>
                                ) : null
                            },
                            props: { compareKey: p.key },
                            sortOrder: 10,
                            id: 'couponTargetProductOperatorEqual'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: ({ compareKey }) =>
                                ['price'].includes(compareKey) ? (
                                  <option value="!=">Not equal</option>
                                ) : null
                            },
                            props: { compareKey: p.key },
                            sortOrder: 15,
                            id: 'couponTargetProductOperatorNotEqual'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: ({ compareKey }) =>
                                ['price'].includes(compareKey) ? (
                                  <option value=">">Greater</option>
                                ) : null
                            },
                            props: { compareKey: p.key },
                            sortOrder: 20,
                            id: 'couponTargetProductOperatorGreater'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: ({ compareKey }) =>
                                ['price'].includes(compareKey) ? (
                                  <option value=">=">Greater or equal</option>
                                ) : null
                            },
                            props: { compareKey: p.key },
                            sortOrder: 25,
                            id: 'couponTargetProductOperatorGreaterOrEqual'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: ({ compareKey }) =>
                                ['price'].includes(compareKey) ? (
                                  <option value="<">Smaller</option>
                                ) : null
                            },
                            props: { compareKey: p.key },
                            sortOrder: 30,
                            id: 'couponTargetProductOperatorSmaller'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: ({ compareKey }) =>
                                ['price'].includes(compareKey) ? (
                                  <option value="<=">Equal or smaller</option>
                                ) : null
                            },
                            props: { compareKey: p.key },
                            sortOrder: 35,
                            id: 'couponTargetProductOperatorEqualOrSmaller'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: ({ compareKey }) =>
                                ['category', 'attribute_group', 'sku'].includes(
                                  compareKey
                                ) ? (
                                  <option value="IN">In</option>
                                ) : null
                            },
                            props: { compareKey: p.key },
                            sortOrder: 40,
                            id: 'couponTargetProductOperatorIn'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: ({ compareKey }) =>
                                ['category', 'attribute_group', 'sku'].includes(
                                  compareKey
                                ) ? (
                                  <option value="NOT IN">Not in</option>
                                ) : null
                            },
                            props: { compareKey: p.key },
                            sortOrder: 45,
                            id: 'couponTargetProductOperatorNotIn'
                          }
                        ]}
                      />
                    </select>
                    <div className="field-border" />
                    <div className="field-suffix">
                      <svg
                        viewBox="0 0 20 20"
                        width="1rem"
                        height="1.25rem"
                        focusable="false"
                        aria-hidden="true"
                      >
                        <path d="m10 16-4-4h8l-4 4zm0-12 4 4H6l4-4z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <Input
                  name={`target_products[products][${i}][value]`}
                  formId="coupon-edit-form"
                  value={p.value}
                  validationRules={['notEmpty']}
                />
              </td>
              <td>
                <a
                  href="#"
                  className="text-critical"
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
          <a href="#" onClick={(e) => addProduct(e)} className="">
            <span>Add product</span>
          </a>
        </div>
      </div>
    </div>
  );
}

Products.propTypes = {
  maxQty: PropTypes.string,
  targetProducts: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      operator: PropTypes.string,
      value: PropTypes.string,
      qty: PropTypes.string
    })
  )
};

Products.defaultProps = {
  maxQty: '',
  targetProducts: []
};

export function TargetProducts({ products, maxQty, discountType }) {
  const [active, setActive] = React.useState(() => {
    if (
      discountType === 'fixed_discount_to_specific_products' ||
      discountType === 'percentage_discount_to_specific_products'
    ) {
      return true;
    } else {
      return false;
    }
  });

  React.useEffect(() => {
    const token = PubSub.subscribe(FORM_FIELD_UPDATED, (message, data) => {
      if (data.name === 'discount_type') {
        if (
          data.value === 'fixed_discount_to_specific_products' ||
          data.value === 'percentage_discount_to_specific_products'
        ) {
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

  if (!active) {
    return null;
  } else {
    return (
      <div>
        <h2 className="card-title">Target products</h2>
        <Products targetProducts={products} maxQty={maxQty} />
      </div>
    );
  }
}

TargetProducts.propTypes = {
  discountType: PropTypes.string,
  maxQty: PropTypes.string,
  products: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      operator: PropTypes.string,
      value: PropTypes.string,
      qty: PropTypes.string
    })
  )
};

TargetProducts.defaultProps = {
  discountType: '',
  maxQty: '',
  products: []
};
