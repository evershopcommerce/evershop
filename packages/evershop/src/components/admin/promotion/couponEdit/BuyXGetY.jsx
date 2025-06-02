import { Field } from '@components/common/form/Field';
import { useModal } from '@components/common/modal/useModal';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';
import React from 'react';
import { FORM_FIELD_UPDATED } from '../../../../lib/util/events';
import ProductSkuSelector from './ProductSkuSelector';

function SkuSelector({ product, updateProduct }) {
  const modal = useModal();
  const closeModal = () => {
    modal.closeModal();
  };

  return (
    <div>
      <a
        href="#"
        className="text-interactive hover:underline"
        onClick={(e) => {
          e.preventDefault();
          modal.openModal();
        }}
      >
        {product.sku ? (
          <span className="italic">&lsquo;{product.sku}&rsquo;</span>
        ) : (
          <span>Choose SKU</span>
        )}
      </a>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <ProductSkuSelector
                selectedChecker={({ sku }) => sku === product.sku}
                onSelect={(sku) => {
                  updateProduct({
                    ...product,
                    sku
                  });
                }}
                onUnSelect={() => {}}
                closeModal={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

SkuSelector.propTypes = {
  product: PropTypes.shape({
    sku: PropTypes.string,
    buyQty: PropTypes.string,
    getQty: PropTypes.string,
    maxY: PropTypes.string,
    discount: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  updateProduct: PropTypes.func.isRequired
};

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
        discount: '100'
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
                    validationRules={['notEmpty']}
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][buy_qty]`}
                    value={p.buyQty}
                    validationRules={['notEmpty', 'number']}
                    placeholder="Buy qty"
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][get_qty]`}
                    value={p.getQty}
                    validationRules={['notEmpty', 'number']}
                    placeholder="Get qty"
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][max_y]`}
                    value={p.maxY}
                    validationRules={['notEmpty', 'number']}
                    placeholder="Max of Y"
                  />
                </td>
                <td>
                  <Field
                    type="text"
                    name={`buyx_gety[${i}][discount]`}
                    value={p.discount}
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
