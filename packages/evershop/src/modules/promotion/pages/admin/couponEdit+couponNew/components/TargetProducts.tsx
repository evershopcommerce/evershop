import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Button } from '@components/common/ui/Button.js';
import { Item, ItemContent, ItemTitle } from '@components/common/ui/Item.js';
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
  maxQty: number;
}) {
  const { setValue, watch, unregister } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray<{
    target_products: {
      products: Product[];
    };
  }>({
    name: 'target_products.products'
  });
  const watchDiscountType = watch('discount_type');
  const fieldWatch = watch('target_products.products');

  useEffect(() => {
    replace(
      targetProducts.map((product) => ({
        key: product.key,
        operator: product.operator,
        value: product.value
      }))
    );
    return () => {
      unregister('target_products.products');
    };
  }, []);

  if (
    watchDiscountType !== 'fixed_discount_to_specific_products' &&
    watchDiscountType !== 'percentage_discount_to_specific_products'
  ) {
    return null;
  }
  return (
    <div>
      <div className="mb-2 mt-2">
        <div className="flex justify-start items-center">
          <div>{_('Maximum')}</div>
          <div style={{ width: '100px', padding: '0 1rem' }}>
            <NumberField
              name="target_products.maxQty"
              defaultValue={maxQty}
              placeholder="10"
              required
              validation={{
                required: _('Maximum quantity is required'),
                min: {
                  value: 0,
                  message: _(
                    'Maximum quantity must be greater than or equal to 0'
                  )
                }
              }}
              min={0}
              wrapperClassName="form-field mb-0"
            />
          </div>
          <div>
            {_('quantity of products are matched bellow conditions(All)')}
          </div>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span>{_('Key')}</span>
            </TableHead>
            <TableHead>
              <span>{_('Operator')}</span>
            </TableHead>
            <TableHead>
              <span>{_('Value')}</span>
            </TableHead>
            <TableHead> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((product, index) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.editable ? (
                  <SelectField
                    name={`target_products.products.${index}.key`}
                    wrapperClassName="form-field mb-0"
                    defaultValue={product.key}
                    disabled={!product.editable}
                    options={options.map((option) => ({
                      value: option.key,
                      label: option.label
                    }))}
                  />
                ) : (
                  <>
                    <InputField
                      type="hidden"
                      name={`target_products.products.${index}.key`}
                      readOnly
                      wrapperClassName="form-field mb-0"
                      value={product.key}
                    />
                    <InputField
                      name={`target_products.products.${index}.keylabel`}
                      readOnly
                      wrapperClassName="form-field mb-0"
                      value={
                        options.find((c) => c.key === product.key)?.label ||
                        _('Unknown')
                      }
                    />
                  </>
                )}
              </TableCell>
              <TableCell>
                {product.editable ? (
                  <SelectField
                    name={`target_products.products.${index}.operator`}
                    defaultValue={product.operator}
                    options={operators.map((operator) => ({
                      value: operator.key,
                      label: operator.label
                    }))}
                    wrapperClassName="form-field mb-0"
                    placeholder={_('Select operator')}
                  />
                ) : (
                  <>
                    <InputField
                      type="hidden"
                      name={`target_products.products.${index}.operator`}
                      readOnly
                      wrapperClassName="form-field mb-0"
                      value={product.operator}
                    />
                    <InputField
                      name={`target_products.products.${index}.operatorlabel`}
                      type="text"
                      readOnly
                      wrapperClassName="form-field mb-0"
                      value={
                        operators.find(
                          (c) => c.key === fieldWatch[index]?.operator
                        )?.label || _('Unknown')
                      }
                    />
                  </>
                )}
              </TableCell>
              <TableCell>
                {fieldWatch[index].key === 'price' && (
                  <NumberField
                    name={`target_products.products.${index}.value`}
                    defaultValue={product.value as number}
                    wrapperClassName="form-field mb-0"
                  />
                )}
                {fieldWatch[index].key !== 'price' && (
                  <>
                    <InputField
                      type="hidden"
                      name={`target_products.products.${index}.value`}
                      value={product.value as string}
                      wrapperClassName="form-field mb-0"
                    />
                    <ValueSelector
                      condition={fieldWatch[index]}
                      updateCondition={(values) => {
                        setValue(
                          `target_products.products.${index}.value`,
                          values
                        );
                      }}
                    />
                  </>
                )}
              </TableCell>
              <TableCell>
                <a
                  href="#"
                  className="text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    remove(index);
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
        <div className="pl-2">
          <Button
            variant={'outline'}
            onClick={(e) => {
              e.preventDefault();
              append({
                key: 'category',
                operator: Operator.EQUAL,
                value: '',
                editable: true
              });
            }}
          >
            <span>{_('Add product')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TargetProductsProps {
  products: Array<Product>;
  maxQty: number;
}
export function TargetProducts({
  products,
  maxQty
}: TargetProductsProps): React.ReactElement | null {
  const { watch } = useFormContext();
  const watchDiscountType = watch('discount_type');
  if (
    watchDiscountType !== 'fixed_discount_to_specific_products' &&
    watchDiscountType !== 'percentage_discount_to_specific_products'
  ) {
    return null;
  }

  return (
    <Item variant={'outline'} className="mt-6">
      <ItemContent>
        <ItemTitle>{_('Target Products')}</ItemTitle>
        <Products targetProducts={products} maxQty={maxQty} />
      </ItemContent>
    </Item>
  );
}
