import PropTypes from 'prop-types';
import React from 'react';
import Area from '@components/common/Area';
import { Field } from '@components/common/form/Field';

export function RequiredProducts({ requiredProducts }) {
  const [products, setProducts] = React.useState(requiredProducts);

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
    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
      <div>
        <span>Order must contains product matched bellow conditions(All)</span>
      </div>
      <table className="table table-auto" style={{ marginTop: 0 }}>
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
            <th>
              <span>Minimum quantity</span>
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
                      name={`condition[required_products][${i}][key]`}
                      className="form-field"
                      value={p.key}
                      onChange={(e) => updateProduct(e, 'key', i)}
                    >
                      <Area
                        id="couponRequiredProductKeyList"
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
                            sortOrder: 10,
                            id: 'requiredProductKeyCategory'
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
                            sortOrder: 20,
                            id: 'requiredProductKeyAttributeGroup'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: () => (
                                <option value="price">Price</option>
                              )
                            },
                            props: {},
                            sortOrder: 30,
                            id: 'requiredProductKeyPrice'
                          },
                          {
                            // eslint-disable-next-line react/no-unstable-nested-components
                            component: {
                              default: () => <option value="sku">Sku</option>
                            },
                            props: {},
                            sortOrder: 40,
                            id: 'requiredProductKeySku'
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
                      name={`condition[required_products][${i}][operator]`}
                      className="form-field"
                      value={p.operator}
                      onChange={(e) => updateProduct(e, 'operator', i)}
                    >
                      <Area
                        id="couponRequiredProductOperatorList"
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
                            id: 'couponRequiredProductOperatorEqual'
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
                            id: 'couponRequiredProductOperatorNotEqual'
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
                            id: 'couponRequiredProductOperatorGreater'
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
                            id: 'couponRequiredProductOperatorGreaterOrEqual'
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
                            id: 'couponRequiredProductOperatorSmaller'
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
                            id: 'couponRequiredProductOperatorEqualOrSmaller'
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
                            id: 'couponRequiredProductOperatorIn'
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
                            id: 'couponRequiredProductOperatorNotIn'
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
                <Field
                  type="text"
                  name={`condition[required_products][${i}][value]`}
                  formId="coupon-edit-form"
                  value={p.value}
                  validationRules={['notEmpty']}
                />
              </td>
              <td>
                <Field
                  type="text"
                  name={`condition[required_products][${i}][qty]`}
                  formId="coupon-edit-form"
                  value={p.qty}
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
          <a href="#" onClick={(e) => addProduct(e)}>
            <span>Add product</span>
          </a>
        </div>
      </div>
    </div>
  );
}

RequiredProducts.propTypes = {
  requiredProducts: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      operator: PropTypes.string,
      value: PropTypes.string,
      qty: PropTypes.string
    })
  )
};

RequiredProducts.defaultProps = {
  requiredProducts: []
};
