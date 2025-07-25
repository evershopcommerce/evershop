import { Field } from '@components/common/form/Field.js';
import React from 'react';
import { options, operators, Operator } from './conditionCriterias.js';
import { ValueSelector } from './ValueSelector.js';

export interface RequiredProduct {
  key: string;
  operator: Operator;
  value: string | number | Array<string> | Array<number>;
  qty: string;
  editable?: boolean;
}

export interface RequiredProductsProps {
  requiredProducts: Array<RequiredProduct>;
}
export function RequiredProducts({ requiredProducts }: RequiredProductsProps) {
  const [products, setProducts] = React.useState<RequiredProduct[]>(() =>
    requiredProducts.map((p) => ({ ...p, editable: false }))
  );

  const addProduct = (e) => {
    e.persist();
    e.preventDefault();
    setProducts(
      products.concat({
        key: 'category',
        operator: Operator.EQUAL,
        value: '',
        qty: '',
        editable: true
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
        if (key === 'key' && e.target.value === p.key) {
          return {
            ...p,
            [key]: e.target.value,
            operator: Operator.EQUAL,
            value: ''
          };
        } else {
          return {
            ...p,
            [key]: e.target.value
          };
        }
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
            <tr key={`${p.key}-${p.operator}-${p.value}-${p.qty}-${i}`}>
              <td>
                <div className="form-field-container dropdown">
                  <div className="field-wrapper">
                    {p.editable ? (
                      <select
                        name={`condition[required_products][${i}][key]`}
                        className="form-control"
                        value={p.key}
                        onChange={(e) => updateProduct(e, 'key', i)}
                        disabled={!p.editable}
                      >
                        {options.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          type="hidden"
                          name={`condition[required_products][${i}][key]`}
                          readOnly
                          value={p.key}
                        />
                        <input
                          type="text"
                          readOnly
                          value={
                            options.find((c) => c.key === p.key)?.label ||
                            'Unknown'
                          }
                        />
                      </>
                    )}
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
                    {p.editable ? (
                      <select
                        name={`condition[required_products][${i}][operator]`}
                        className="form-control"
                        value={p.operator}
                        onChange={(e) => updateProduct(e, 'operator', i)}
                      >
                        {operators.map((operator) => (
                          <option key={operator.key} value={operator.key}>
                            {operator.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <input
                          type="hidden"
                          name={`condition[required_products][${i}][operator]`}
                          readOnly
                          value={p.operator}
                        />
                        <input
                          type="text"
                          readOnly
                          value={
                            operators.find((c) => c.key === p.operator)
                              ?.label || 'Unknown'
                          }
                        />
                      </>
                    )}
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
                {(typeof p.value === 'string' ||
                  typeof p.value === 'number') && (
                  <input
                    type="hidden"
                    name={`condition[required_products][${i}][value]`}
                    value={p.value}
                  />
                )}
                {Array.isArray(p.value) && (
                  <>
                    {p.value.map((v, j) => (
                      <input
                        key={j}
                        type="hidden"
                        name={`condition[required_products][${i}][value][]`}
                        value={v}
                      />
                    ))}
                  </>
                )}
                <ValueSelector
                  condition={p}
                  updateCondition={(values) => {
                    const updatedProducts = products.map((prod, idx) =>
                      idx === i ? { ...prod, value: values } : prod
                    );
                    setProducts(updatedProducts);
                  }}
                />
              </td>
              <td>
                <div style={{ width: '60px' }}>
                  <Field
                    type="text"
                    name={`condition[required_products][${i}][qty]`}
                    formId="coupon-edit-form"
                    value={p.qty}
                    validationRules={['notEmpty']}
                    placeholder="Enter the quantity"
                  />
                </div>
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
      <div className="mt-4 flex justify-start">
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
        <div className="pl-4">
          <a href="#" onClick={(e) => addProduct(e)}>
            <span>Add product</span>
          </a>
        </div>
      </div>
    </div>
  );
}

RequiredProducts.defaultProps = {
  requiredProducts: []
};
