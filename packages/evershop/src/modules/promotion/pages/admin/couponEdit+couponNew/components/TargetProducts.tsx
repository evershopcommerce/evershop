import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
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
          <div>Maximum</div>
          <div style={{ width: '100px', padding: '0 1rem' }}>
            <NumberField
              name="target_products.maxQty"
              defaultValue={maxQty}
              placeholder="10"
              required
              validation={{
                required: 'Maximum quantity is required',
                min: {
                  value: 0,
                  message: 'Maximum quantity must be greater than or equal to 0'
                }
              }}
              min={0}
              wrapperClassName="form-field mb-0"
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
          {fields.map((product, index) => (
            <tr key={product.id}>
              <td>
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
                        'Unknown'
                      }
                    />
                  </>
                )}
              </td>
              <td>
                {product.editable ? (
                  <SelectField
                    name={`target_products.products.${index}.operator`}
                    defaultValue={product.operator}
                    options={operators.map((operator) => ({
                      value: operator.key,
                      label: operator.label
                    }))}
                    wrapperClassName="form-field mb-0"
                    placeholder="Select operator"
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
                        options.find((c) => c.key === product.operator)
                          ?.label || 'Unknown'
                      }
                    />
                  </>
                )}
              </td>
              <td>
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
              </td>
              <td>
                <a
                  href="#"
                  className="text-critical"
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
                key: 'category',
                operator: Operator.EQUAL,
                value: '',
                editable: true
              });
            }}
            className=""
          >
            <span>Add product</span>
          </a>
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
    <div>
      <h3 className="card-title">Target products</h3>
      <Products targetProducts={products} maxQty={maxQty} />
    </div>
  );
}
