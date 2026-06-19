import { ProductSelector } from '@components/admin/ProductSelector.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
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
  const onSelect = (sku) => {
    updateProduct({
      ...product,
      sku
    });
  };

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant={'link'}>
          {product.sku ? (
            <span className="italic">&lsquo;{product.sku}&rsquo;</span>
          ) : (
            <span>{_('Choose SKU')}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className={'max-w-[80vw]'}>
        <DialogHeader>
          <DialogTitle>{_('Choose Product SKU')}</DialogTitle>
        </DialogHeader>
        <ProductSelector
          selectedProducts={[product].map((p) => ({
            sku: p.sku,
            uuid: undefined,
            productId: undefined
          }))}
          onSelect={onSelect}
          onUnSelect={() => {}}
        />
      </DialogContent>
    </Dialog>
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span>{_('SKU')}</span>
            </TableHead>
            <TableHead>
              <span>{_('X')}</span>
            </TableHead>
            <TableHead>
              <span>{_('Y')}</span>
            </TableHead>
            <TableHead>
              <span>{_('Max of Y')}</span>
            </TableHead>
            <TableHead>
              <span>{_('Discount percent')}</span>
            </TableHead>
            <TableHead> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((p, i) => (
            <TableRow key={p.id}>
              <TableCell>
                <SkuSelector
                  product={p}
                  updateProduct={(product) => {
                    update(i, {
                      ...p,
                      sku: product.sku
                    });
                  }}
                />
              </TableCell>
              <TableCell>
                <NumberField
                  name={`buyx_gety.${i}.buy_qty`}
                  defaultValue={p.buyQty}
                  placeholder={_('Buy qty')}
                  required
                  validation={{
                    required: _('Buy qty is required')
                  }}
                />
              </TableCell>
              <TableCell>
                <NumberField
                  name={`buyx_gety.${i}.get_qty`}
                  defaultValue={p.getQty}
                  placeholder={_('Get qty')}
                  required
                  validation={{
                    required: _('Get qty is required')
                  }}
                />
              </TableCell>
              <TableCell>
                <NumberField
                  name={`buyx_gety.${i}.max_y`}
                  defaultValue={p.maxY}
                  placeholder={_('Max of Y')}
                  required
                  validation={{
                    required: _('Max of Y is required')
                  }}
                />
              </TableCell>
              <TableCell>
                <NumberField
                  name={`buyx_gety.${i}.discount`}
                  defaultValue={p.discount}
                  placeholder={_('Discount percent')}
                  required
                  validation={{
                    required: _('Discount percent is required')
                  }}
                  unit="%"
                />
              </TableCell>
              <TableCell>
                <a
                  className="text-destructive"
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
            <span>{_('Add product')}</span>
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
