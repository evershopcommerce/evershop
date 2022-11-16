/* eslint-disable jsx-a11y/anchor-is-valid */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import produce from 'immer';
import Area from '../../../../../lib/components/Area';
import { Form } from '../../../../../lib/components/form/Form';
import { Field } from '../../../../../lib/components/form/Field';
import Button from '../../../../../lib/components/form/Button';
import './Form.scss';
import { useAppDispatch, useAppState } from '../../../../../lib/context/app';

function ToastMessage({
  thumbnail, name, qty, count, cartUrl, toastId
}) {
  return (
    <div className="toast-mini-cart">
      <div className="top-head grid grid-cols-2">
        <div className="self-center">
          JUST ADDED TO YOUR CART
        </div>
        <div className="self-center close flex justify-end">
          <a href="#" onClick={(e) => { e.preventDefault(); toast.dismiss(toastId); }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </div>
      <div className="item-line flex justify-between">
        <div className="popup-thumbnail flex justify-center">
          <img src={thumbnail} alt={name} />
        </div>
        <div className="item-info flex justify-between">
          <div className="name">
            <span className="font-bold">{name}</span>
          </div>
          <div>
            Qty:
            {qty}
          </div>
        </div>
      </div>
      <a className="add-cart-popup-button" href={cartUrl}>
        VIEW CART (
        {count}
        )
      </a>
      <a className="add-cart-popup-continue text-center underline block" href="#" onClick={(e) => { e.preventDefault(); toast.dismiss(toastId); }}>Continue shopping</a>
    </div>
  );
}

ToastMessage.propTypes = {
  cartUrl: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  qty: PropTypes.number.isRequired,
  thumbnail: PropTypes.string.isRequired,
  toastId: PropTypes.string.isRequired
};

function AddToCart({ stockAvaibility, loading = false, error }) {
  return (
    <div className="add-to-cart mt-2">
      <div style={{ width: '8rem' }}>
        <Field type="text" value="1" validationRules={['notEmpty']} className="qty" name="qty" placeholder="Qty" formId="productForm" />
      </div>
      {error && <div className="text-critical mt-1">{error}</div>}
      <div className="mt-1">
        {stockAvaibility === true && (
          <Button
            title="ADD TO CART"
            outline
            isLoading={loading}
            onAction={
              () => { document.getElementById('productForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
            }
          />
        )}
        {stockAvaibility === false && <Button title="SOLD OUT" onAction={() => { }} />}
      </div>
    </div>
  );
}

AddToCart.propTypes = {
  error: PropTypes.string,
  loading: PropTypes.bool.isRequired,
  stockAvaibility: PropTypes.bool.isRequired
};

AddToCart.defaultProps = {
  error: undefined
};

export default function ProductForm({ product, action, cart }) {
  const [loading, setLoading] = useState(false);
  const [toastId, setToastId] = useState();
  const [error, setError] = useState();
  const appContext = useAppState();
  const dispatch = useAppDispatch();

  const onSuccess = (response) => {
    if (response.success === true) {
      dispatch(produce(appContext, (draff) => {
        // eslint-disable-next-line no-param-reassign
        draff.cart = appContext.cart || {};
        draff.cart.totalQty = response.data.count;
        draff.cart.uuid = response.data.cartId;
      }));
      setToastId(toast(<ToastMessage
        thumbnail={response.data.item.thumbnail}
        name={product.name}
        qty={1}
        count={response.data.count}
        cartUrl="/cart"
        toastId={toastId}
      />, { closeButton: false }));
    } else {
      setError(response.message);
    }
  };

  return (
    <Form
      id="productForm"
      action={action}
      method="POST"
      submitBtn={false}
      onSuccess={onSuccess}
      onStart={() => setLoading(true)}
      onComplete={() => setLoading(false)}
      onError={(e) => setError(e.message)}
      isJSON={true}
    >
      <input type="hidden" name="productId" value={product.productId} />
      {(appContext.cart?.uuid || cart?.uuid) && <input type="hidden" name="cartId" value={appContext.cart?.uuid || cart?.uuid} />}

      <Area
        id="productSinglePageForm"
        coreComponents={[
          {
            component: { default: AddToCart },
            props: {
              stockAvaibility: product.inventory.isInStock,
              loading,
              error
            },
            sortOrder: 50,
            id: 'productSingleBuyButton'
          }
        ]}
      />
    </Form>
  );
}

ProductForm.propTypes = {
  action: PropTypes.string.isRequired
};

export const layout = {
  areaId: "productPageMiddleRight",
  sortOrder: 20
}

export const query = `
  query Query {
    product(id: getContextValue('productId')) {
      productId
      name
      gallery {
        thumb
      }
      inventory {
        isInStock
      }
    }
    cart(id: getContextValue('cartId', null)) {
      uuid
    }
    action:url (routeId: "addToCart")
  }
`