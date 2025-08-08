import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import { useAppDispatch, useAppState } from '@components/common/context/app.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import ProductNoThumbnail from '@components/common/ProductNoThumbnail.js';
import { produce } from 'immer';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { _ } from '../../../../../lib/locale/translate/_.js';
import './Form.scss';

const ToastMessage: React.FC<{
  thumbnail?: string;
  name: string;
  qty: number;
  count: number;
  cartUrl: string;
  toastId: string;
}> = ({ thumbnail, name, qty, count, cartUrl, toastId }) => {
  return (
    <div className="toast-mini-cart">
      <div className="top-head grid grid-cols-2">
        <div className="self-center">{_('JUST ADDED TO YOUR CART')}</div>
        <div className="self-center close flex justify-end">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast.dismiss(toastId);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </a>
        </div>
      </div>
      <div className="item-line flex justify-between">
        <div className="popup-thumbnail flex justify-center items-center">
          {thumbnail ? (
            <img src={thumbnail} alt={name} />
          ) : (
            <ProductNoThumbnail width={25} height={25} />
          )}
        </div>
        <div className="item-info flex justify-between">
          <div className="name">
            <span className="font-bold">{name}</span>
          </div>
          <div>{_('QTY: ${qty}', { qty: qty.toString() })}</div>
        </div>
      </div>
      <a className="add-cart-popup-button" href={cartUrl}>
        {_('VIEW CART (${count})', { count: count.toString() })}
      </a>
      <a
        className="add-cart-popup-continue text-center underline block"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          toast.dismiss(toastId);
        }}
      >
        {_('Continue Shopping')}
      </a>
    </div>
  );
};

const AddToCart: React.FC<{ stockAvaibility: boolean; error?: string }> = ({
  stockAvaibility,
  error
}) => {
  const { formState } = useFormContext();
  return (
    <div className="add-to-cart mt-5">
      <div style={{ width: '8rem' }}>
        <NumberField
          defaultValue={1}
          allowDecimals={false}
          required
          validation={{
            required: _('Qty is required'),
            min: { value: 1, message: _('Qty must be greater than 0') }
          }}
          className="qty"
          name="qty"
          placeholder={_('Qty')}
        />
      </div>
      {error && <div className="text-critical mt-2">{error}</div>}
      <div className="mt-2">
        {stockAvaibility === true && (
          <Button
            title={_('ADD TO CART')}
            outline
            isLoading={formState.isSubmitting}
            onAction={() => {
              (
                document.getElementById('productForm') as HTMLFormElement
              ).dispatchEvent(
                new Event('submit', { cancelable: true, bubbles: true })
              );
            }}
          />
        )}
        {stockAvaibility === false && (
          <Button title={_('SOLD OUT')} onAction={() => {}} />
        )}
      </div>
    </div>
  );
};

interface ProductFormProps {
  product: {
    inventory: {
      isInStock: boolean;
    };
    name: string;
    sku: string;
  };
  action: string;
}
export default function ProductForm({ product, action }: ProductFormProps) {
  const [toastId, setToastId] = useState();
  const [error, setError] = useState();
  const appContext = useAppState();
  const { setData } = useAppDispatch();

  const onSuccess = (response) => {
    if (!response.error) {
      setData(
        produce(appContext, (draff) => {
          draff.cart = appContext.cart || {};
          draff.cart.totalQty = response.data.count;
          draff.cart.uuid = response.data.cartId;
        })
      );
      setToastId(
        toast(
          <ToastMessage
            thumbnail={response.data.item.thumbnail}
            name={product.name}
            qty={response.data.item.qty}
            count={response.data.count}
            cartUrl="/cart"
            toastId={`${toastId}-${Math.random().toString(36).slice(2)}`}
          />,
          { closeButton: false }
        )
      );
    } else {
      setError(response.error.message);
    }
  };

  return (
    <Form
      id="productForm"
      action={action}
      method="POST"
      submitBtn={false}
      onSuccess={onSuccess}
      onError={(e) => setError(e.message)}
    >
      <InputField type="hidden" name="sku" defaultValue={product.sku} />
      <Area
        id="productSinglePageForm"
        coreComponents={[
          {
            component: { default: AddToCart },
            props: {
              stockAvaibility: product.inventory.isInStock,
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

export const layout = {
  areaId: 'productPageMiddleRight',
  sortOrder: 45
};

export const query = `
  query Query {
    product(id: getContextValue('productId')) {
      productId
      sku
      name
      gallery {
        thumb
      }
      inventory {
        isInStock
      }
    }
    action:url (routeId: "addMineCartItem")
  }
`;
