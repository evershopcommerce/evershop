import { ProductSelector } from '@components/admin/ProductSelector.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

interface Product {
  sku: string;
  buyQty: string | number;
  getQty: string | number;
  maxY: string | number;
  discount: string | number;
}
const SkuSelector: React.FC<{
  product: Product;
  updateProduct: (product: Product) => void;
}> = ({ product, updateProduct }) => {
  const modal = useModal();

  const onSelect = (sku) => {
    updateProduct({
      ...product,
      sku
    });
    modal.close();
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
      <Modal title="Select SKU" onClose={modal.close} isOpen={modal.isOpen}>
        <ProductSelector
          selectedProducts={[product].map((p) => ({
            sku: p.sku,
            uuid: undefined,
            productId: undefined
          }))}
          onSelect={onSelect}
          onUnSelect={() => {}}
        />
      </Modal>
    </div>
  );
};

interface Field {
  sku: string;
  buyQty: number;
  getQty: number;
  maxY: number;
  discount: number;
}

interface BuyXGetY {
  buyx_gety: Field[];
}

const BuyXGetYList: React.FC<{
  requireProducts: Array<Product>;
}> = ({ requireProducts }) => {
  const { unregister } = useFormContext();
  const { fields, append, remove, update, replace } = useFieldArray<BuyXGetY>({
    name: 'buyx_gety'
  });

  useEffect(() => {
    replace(
      requireProducts.map(
        (product) =>
          ({
            sku: product.sku,
            buyQty:
              typeof product.buyQty === 'string'
                ? parseInt(product.buyQty) || 1
                : product.buyQty,
            getQty:
              typeof product.getQty === 'string'
                ? parseInt(product.getQty) || 1
                : product.getQty,
            maxY:
              typeof product.maxY === 'string'
                ? parseInt(product.maxY) || 2
                : product.maxY,
            discount:
              typeof product.discount === 'string'
                ? parseInt(product.discount) || 100
                : product.discount
          } as Field)
      )
    );
    return () => {
      unregister('buyx_gety'); // Cleanup: unregister field when component unmounts
    };
  }, []);

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
          {fields.map((p, i) => (
            <tr key={p.id}>
              <td>
                <SkuSelector
                  product={p}
                  updateProduct={(product) => {
                    update(i, {
                      ...p,
                      sku: product.sku
                    });
                  }}
                />
              </td>
              <td>
                <NumberField
                  name={`buyx_gety.${i}.buy_qty`}
                  defaultValue={p.buyQty}
                  placeholder="Buy qty"
                  required
                  validation={{
                    required: 'Buy qty is required'
                  }}
                />
              </td>
              <td>
                <NumberField
                  name={`buyx_gety.${i}.get_qty`}
                  defaultValue={p.getQty}
                  placeholder="Get qty"
                  required
                  validation={{
                    required: 'Get qty is required'
                  }}
                />
              </td>
              <td>
                <NumberField
                  name={`buyx_gety.${i}.max_y`}
                  defaultValue={p.maxY}
                  placeholder="Max of Y"
                  required
                  validation={{
                    required: 'Max of Y is required'
                  }}
                />
              </td>
              <td>
                <NumberField
                  name={`buyx_gety.${i}.discount`}
                  defaultValue={p.discount}
                  placeholder="Discount percent"
                  required
                  validation={{
                    required: 'Discount percent is required'
                  }}
                  unit="%"
                />
              </td>
              <td>
                <a
                  className="text-critical"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    remove(i);
                  }}
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
      <div className="mt-2 flex justify-start">
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
        <div className="pl-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              append({
                sku: '',
                buyQty: 1,
                getQty: 1,
                maxY: 2,
                discount: 100
              } as Field);
            }}
          >
            <span>Add product</span>
          </a>
        </div>
      </div>
    </div>
  );
};

const BuyXGetY: React.FC<{
  requireProducts: Array<Product>;
  discountType: string;
}> = ({ requireProducts }) => {
  const { watch } = useFormContext();
  const watchDiscountType = watch('discount_type');

  if (watchDiscountType !== 'buy_x_get_y') {
    return null;
  }

  return <BuyXGetYList requireProducts={requireProducts} />;
};

export { BuyXGetY };
