import { ProductSelector } from '@components/admin/ProductSelector.js';
import { Field } from '@components/common/form/Field.js';
import { useModal } from '@components/common/modal/useModal.js';
import PubSub from 'pubsub-js';
import React from 'react';
import { FORM_FIELD_UPDATED } from '../../../../../../lib/util/events.js';

interface Product {
  sku: string;
  buyQty: string;
  getQty: string;
  maxY: string;
  discount: string | number;
}
const SkuSelector: React.FC<{
  product: Product;
  updateProduct: (product: Product) => void;
}> = ({ product, updateProduct }) => {
  const modal = useModal();

  const onSelect = async (sku) => {
    updateProduct({
      ...product,
      sku
    });
    modal.close();
    return Promise.resolve();
  };

  return (
    <div>
      <a
        href="#"
        className="text-interactive hover:underline"
        onClick={(e) => {
          e.preventDefault();
          modal.open();
        }}
      >
        {product.sku ? (
          <span className="italic">&lsquo;{product.sku}&rsquo;</span>
        ) : (
          <span>Choose SKU</span>
        )}
      </a>
      <modal.Content title="Select SKU">
        <ProductSelector
          selectedProducts={[product].map((p) => ({
            sku: p.sku,
            uuid: undefined,
            productId: undefined
          }))}
          onSelect={onSelect}
          onUnSelect={() => {}}
        />
      </modal.Content>
    </div>
  );
};

const BuyXGetY: React.FC<{
  requireProducts: Array<Product>;
  discountType: string;
}> = ({ requireProducts, discountType }) => {
  const [products, setProducts] =
    React.useState<Array<Product>>(requireProducts);
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
        buyQty: '',
        getQty: '',
        maxY: '',
        discount: '100'
      } as Product)
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
              <tr key={`${p.sku}-${i}`}>
                <td>
                  <SkuSelector
                    product={p}
                    updateProduct={(product) => {
                      setProducts(
                        products.map((p, index) => {
                          if (index === i) {
                            return product;
                          } else {
                            return p;
                          }
                        })
                      );
                    }}
                  />
                  <Field
                    type="hidden"
                    name={`buyx_gety[${i}][sku]`}
                    value={p.sku}
                    onChange={(e) => {
                      setProducts(
                        products.map((prod, index) => {
                          if (index === i) {
                            return { ...prod, sku: e.target.value };
                          }
                          return prod;
                        })
                      );
                    }}
                    validationRules={['notEmpty']}
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][buy_qty]`}
                    value={p.buyQty}
                    onChange={(e) => {
                      setProducts(
                        products.map((prod, index) => {
                          if (index === i) {
                            return { ...prod, buyQty: e.target.value };
                          }
                          return prod;
                        })
                      );
                    }}
                    validationRules={['notEmpty', 'number']}
                    placeholder="Buy qty"
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][get_qty]`}
                    value={p.getQty}
                    onChange={(e) => {
                      setProducts(
                        products.map((prod, index) => {
                          if (index === i) {
                            return { ...prod, getQty: e.target.value };
                          }
                          return prod;
                        })
                      );
                    }}
                    validationRules={['notEmpty', 'number']}
                    placeholder="Get qty"
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][max_y]`}
                    value={p.maxY}
                    onChange={(e) => {
                      setProducts(
                        products.map((prod, index) => {
                          if (index === i) {
                            return { ...prod, maxY: e.target.value };
                          }
                          return prod;
                        })
                      );
                    }}
                    validationRules={['notEmpty', 'number']}
                    placeholder="Max of Y"
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][discount]`}
                    value={p.discount}
                    onChange={(e) => {
                      setProducts(
                        products.map((prod, index) => {
                          if (index === i) {
                            return { ...prod, discount: e.target.value };
                          }
                          return prod;
                        })
                      );
                    }}
                    validationRules={['notEmpty']}
                    placeholder="Discount percent"
                    suffix="%"
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
  } else {
    return null;
  }
};

export { BuyXGetY };
