import { Field } from '@components/common/form/Field.js';
import PubSub from 'pubsub-js';
import React from 'react';
import { FORM_FIELD_UPDATED } from '../../../../../../lib/util/events.js';
import { options, operators, Operator } from './conditionCriterias.js';
import { ValueSelector } from './ValueSelector.js';

export interface Product {
  key: string;
  operator: Operator;
  value: string | number | string[] | number[];
  editable?: boolean;
}

function Products({
  targetProducts,
  maxQty
}: {
  targetProducts: Product[];
  maxQty: string;
}) {
  const [products, setProducts] = React.useState<Product[]>(() =>
    targetProducts.map((p) => ({ ...p, editable: false }))
  );

  const addProduct = (e) => {
    e.persist();
    e.preventDefault();
    setProducts(
      products.concat({
        key: 'category',
        operator: Operator.EQUAL,
        value: '',
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
    <div>
      <div className="mb-4 mt-4">
        <div className="flex justify-start items-center mb-12">
          <div>Maximum</div>
          <div style={{ width: '70px', padding: '0 1rem' }}>
            <Field
              type="text"
              name="target_products[maxQty]"
              value={maxQty}
              placeholder="10"
              validationRules={['notEmpty', 'number']}
            />
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
            <tr key={i}>
              <td>
                <div className="form-field-container dropdown">
                  <div className="field-wrapper">
                    {p.editable ? (
                      <select
                        name={`target_products[products][${i}][key]`}
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
                          name={`target_products[products][${i}][key]`}
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
                        name={`target_products[products][${i}][operator]`}
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
                          name={`target_products[products][${i}][operator]`}
                          readOnly
                          value={p.operator}
                        />
                        <input
                          type="text"
                          readOnly
                          value={
                            options.find((c) => c.key === p.operator)?.label ||
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
                {typeof p.value === 'string' && (
                  <input
                    type="hidden"
                    name={`target_products[products][${i}][value]`}
                    value={p.value}
                  />
                )}
                {Array.isArray(p.value) && (
                  <>
                    {p.value.map((v, j) => (
                      <input
                        key={j}
                        type="hidden"
                        name={`target_products[products][${i}][value][]`}
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
          <a href="#" onClick={(e) => addProduct(e)} className="">
            <span>Add product</span>
          </a>
        </div>
      </div>
    </div>
  );
}

Products.defaultProps = {
  maxQty: '',
  targetProducts: []
};

interface TargetProductsProps {
  products: Array<Product>;
  qty: string;
  maxQty: string;
  discountType: string;
}
export function TargetProducts({
  products,
  maxQty,
  discountType
}: TargetProductsProps): React.ReactElement | null {
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

TargetProducts.defaultProps = {
  discountType: '',
  maxQty: '',
  products: []
};
