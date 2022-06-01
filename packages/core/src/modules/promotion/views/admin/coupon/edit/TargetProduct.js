import PropTypes from "prop-types";
import React from 'react';
import Area from "../../../../../../lib/components/Area";
import { Input } from "../../../../../../lib/components/form/fields/Input";
import PubSub from "pubsub-js";
import { FORM_FIELD_UPDATED } from "../../../../../../lib/util/events";

function Products({ targetProducts, maxQty = '' }) {
  const [products, setProducts] = React.useState(targetProducts);
  const [maxQuantity, setMaxQuantity] = React.useState(maxQty);

  const addProduct = (e) => {
    e.persist();
    e.preventDefault();
    setProducts(products.concat({
      key: '',
      operator: '',
      value: '',
      qty: ''
    }));
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
      } else { return p; }
    });
    setProducts(newProducts);
  };

  return (
    <div>
      <div className="mb-3">
        <span>
          Maximum
          <input style={{ display: 'inline', width: '50px' }} name="target_products[maxQty]" type="text" value={maxQuantity} onChange={(e) => setMaxQuantity(e.target.value)} className="form-control" />
          {' '}
          quantity of products are matched bellow conditions(All)
        </span>
      </div>
      <table className="table table-bordered" style={{ marginTop: 0 }}>
        <thead>
          <tr>
            <th><span>Key</span></th>
            <th><span>Operator</span></th>
            <th><span>Value</span></th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i}>
              <td>
                <select
                  name={`target_products[products][${i}][key]`}
                  className="form-control"
                  value={p.key}
                  onChange={(e) => updateProduct(e, 'key', i)}
                >
                  <Area
                    id="coupon_target_product_key_list"
                    noOuter
                    coreComponents={[
                      {
                        component: () => <option value="category">CategoryId</option>,
                        props: {},
                        sortOrder: 10,
                        id: 'targetProductKeyCategory'
                      },
                      {
                        component: () => <option value="attribute_group">Attribute Group</option>,
                        props: {},
                        sortOrder: 20,
                        id: 'targetProductKeyAttributeGroup'
                      },
                      {
                        component: () => <option value="price">Price</option>,
                        props: {},
                        sortOrder: 30,
                        id: 'targetProductKeyPrice'
                      },
                      {
                        component: () => <option value="sku">Sku</option>,
                        props: {},
                        sortOrder: 40,
                        id: 'targetProductKeySku'
                      }
                    ]}
                  />
                </select>
              </td>
              <td>
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
                        component: () => <option value="=">Equal</option>,
                        props: {},
                        sortOrder: 10,
                        id: 'couponTargetProductOperatorEqual'
                      },
                      {
                        component: () => <option value="<>">Not equal</option>,
                        props: {},
                        sortOrder: 10,
                        id: 'couponTargetProductOperatorEqual'
                      },
                      {
                        component: () => <option value=">">Greater</option>,
                        props: {},
                        sortOrder: 20,
                        id: 'couponTargetProductOperatorGreater'
                      },
                      {
                        component: () => <option value=">=">Greater or equal</option>,
                        props: {},
                        sortOrder: 30,
                        id: 'couponTargetProductOperatorGreaterOrEqual'
                      },
                      {
                        component: () => <option value="<">Smaller</option>,
                        props: {},
                        sortOrder: 40,
                        id: 'couponTargetProductOperatorSmaller'
                      },
                      {
                        component: () => <option value="<=">Equal or smaller</option>,
                        props: {},
                        sortOrder: 40,
                        id: 'couponTargetProduct_operator_equal_or_smaller'
                      },
                      {
                        component: () => <option value="IN">In</option>,
                        props: {},
                        sortOrder: 40,
                        id: 'coupon_target_product_operator_in'
                      },
                      {
                        component: () => <option value="NOT IN">Not in</option>,
                        props: {},
                        sortOrder: 40,
                        id: 'coupon_target_product_operator_not_in'
                      }
                    ]}
                  />
                </select>
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
                <a href="#" className="text-critical" onClick={(e) => removeProduct(e, i)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width={'1.5rem'} height={'1.5rem'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                  </svg>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 flex justify-start content-center">
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" width={'1.5rem'} height={'1.5rem'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div className="pl-1">
          <a href="#" onClick={(e) => addProduct(e)} className="">
            <span>Add condition</span>
          </a>
        </div>
      </div>
    </div>
  );
}

Products.propTypes = {
  maxQty: PropTypes.string,
  targetProducts: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    operator: PropTypes.string,
    value: PropTypes.string,
    qty: PropTypes.string
  }))
}

export function TargetProducts({ products, maxQty, discountType }) {
  const [active, setActive] = React.useState(() => {
    if (discountType === 'fixed_discount_to_specific_products' || discountType === 'percentage_discount_to_specific_products') {
      return true;
    } else {
      return false;
    }
  });

  React.useEffect(() => {
    const token = PubSub.subscribe(FORM_FIELD_UPDATED, (message, data) => {
      if (
        data.name === 'discount_type'
        && (data.value === 'fixed_discount_to_specific_products' || data.value === 'percentage_discount_to_specific_products')) {
        setActive(true);
      } else {
        setActive(false);
      }
    });

    return function cleanup() {
      PubSub.unsubscribe(token);
    };
  }, []);

  return (
    <>
      {active === true && (
        <div className="sml-block mt-4">
          <div className="sml-block-title">Target products</div>
          <Products targetProducts={products} maxQty={maxQty} />
        </div>
      )}
    </>
  );
}

TargetProducts.propTypes = {
  discountType: PropTypes.string,
  maxQty: PropTypes.string,
  products: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    operator: PropTypes.string,
    value: PropTypes.string,
    qty: PropTypes.string
  }))
}
