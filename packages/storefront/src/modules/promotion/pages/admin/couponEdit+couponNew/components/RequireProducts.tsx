import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import React, { useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { options, operators, Operator } from './conditionCriterias.js';
import { ValueSelector } from './ValueSelector.js';

export interface RequiredProduct {
  key: string;
  operator: Operator;
  value: string | number | Array<string> | Array<number>;
  qty: string;
  editable?: boolean;
}

export interface RequiredProductsProps {
  requiredProducts: Array<RequiredProduct>;
}

interface RequiredProducts {
  condition: {
    required_products: Array<RequiredProduct>;
  };
}

export function RequiredProducts({ requiredProducts }: RequiredProductsProps) {
  const { setValue, watch } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray<RequiredProducts>({
    name: 'condition.required_products'
  });

  useEffect(() => {
    replace(requiredProducts);
  }, []);

  const fieldsWatch = watch('condition.required_products');

  return (
    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
      <div>
        <span>Order must contains product matched bellow conditions(All)</span>
      </div>
      <table className="table table-auto" style={{ marginTop: 0 }}>
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
            <th>
              <span>Minimum quantity</span>
            </th>
            <th> </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((p, i) => (
            <tr key={p.id}>
              <td>
                {p.editable ? (
                  <SelectField
                    name={`condition.required_products.${i}.key`}
                    defaultValue={p.key}
                    options={options.map((option) => ({
                      value: option.key,
                      label: option.label
                    }))}
                    wrapperClassName="form-field mb-0"
                  />
                ) : (
                  <>
                    <InputField
                      type="hidden"
                      name={`condition.required_products.${i}.key`}
                      readOnly
                      value={p.key}
                      wrapperClassName="form-field mb-0"
                    />
                    <InputField
                      name={`condition.required_products.${i}.keylabel`}
                      readOnly
                      value={
                        options.find((c) => c.key === p.key)?.label || 'Unknown'
                      }
                      wrapperClassName="form-field mb-0"
                    />
                  </>
                )}
              </td>
              <td>
                {p.editable ? (
                  <SelectField
                    options={operators.map((operator) => ({
                      value: operator.key,
                      label: operator.label
                    }))}
                    name={`condition.required_products.${i}.operator`}
                    defaultValue={p.operator}
                    wrapperClassName="form-field mb-0"
                  />
                ) : (
                  <>
                    <InputField
                      type="hidden"
                      name={`condition.required_products.${i}.operator`}
                      readOnly
                      value={p.operator}
                      wrapperClassName="form-field mb-0"
                    />
                    <InputField
                      readOnly
                      name={`condition.required_products.${i}.operatorlabel`}
                      value={
                        operators.find((c) => c.key === p.operator)?.label ||
                        'Unknown'
                      }
                      wrapperClassName="form-field mb-0"
                    />
                  </>
                )}
              </td>
              <td>
                {fieldsWatch[i].key === 'price' && (
                  <NumberField
                    name={`condition.required_products.${i}.value`}
                    defaultValue={p.value as number}
                    wrapperClassName="form-field mb-0"
                  />
                )}
                {fieldsWatch[i].key !== 'price' && (
                  <>
                    <InputField
                      type="hidden"
                      name={`condition.required_products.${i}.value`}
                      value={p.value as number}
                      wrapperClassName="form-field mb-0"
                    />
                    <ValueSelector
                      condition={fieldsWatch[i]}
                      updateCondition={(values) => {
                        setValue(
                          `condition.required_products.${i}.value`,
                          values
                        );
                      }}
                    />
                  </>
                )}
              </td>
              <td>
                <div style={{ width: '80px' }}>
                  <NumberField
                    name={`condition.required_products.${i}.qty`}
                    defaultValue={
                      typeof p.qty === 'number'
                        ? p.qty
                        : parseInt(p.qty, 10) || 1
                    }
                    placeholder="Enter the quantity"
                    required
                    validation={{
                      required: 'Minimum quantity is required',
                      min: {
                        value: 1,
                        message: ''
                      }
                    }}
                    wrapperClassName="form-field mb-0"
                  />
                </div>
              </td>
              <td>
                <a
                  href="#"
                  className="text-critical"
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
                key: 'category',
                operator: Operator.EQUAL,
                value: '',
                qty: '',
                editable: true
              });
            }}
          >
            <span>Add product</span>
          </a>
        </div>
      </div>
    </div>
  );
}

RequiredProducts.defaultProps = {
  requiredProducts: []
};
