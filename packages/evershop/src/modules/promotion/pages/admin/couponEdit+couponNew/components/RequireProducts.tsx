import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Button } from '@components/common/ui/Button.js';
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

export function RequiredProducts({
  requiredProducts = []
}: RequiredProductsProps) {
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
        <span>
          {_('Order must contain products matching all conditions below')}
        </span>
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
            <TableHead>
              <span>{_('Minimum quantity')}</span>
            </TableHead>
            <TableHead> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((p, i) => (
            <TableRow key={p.id}>
              <TableCell>
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
                        options.find((c) => c.key === p.key)?.label ||
                        _('Unknown')
                      }
                      wrapperClassName="form-field mb-0"
                    />
                  </>
                )}
              </TableCell>
              <TableCell>
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
                        operators.find(
                          (c) => c.key === fieldsWatch[i]?.operator
                        )?.label || _('Unknown')
                      }
                      wrapperClassName="form-field mb-0"
                    />
                  </>
                )}
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                <div style={{ width: '80px' }}>
                  <NumberField
                    name={`condition.required_products.${i}.qty`}
                    defaultValue={
                      typeof p.qty === 'number'
                        ? p.qty
                        : parseInt(p.qty, 10) || 1
                    }
                    placeholder={_('Enter the quantity')}
                    required
                    validation={{
                      required: _('Minimum quantity is required'),
                      min: {
                        value: 1,
                        message: ''
                      }
                    }}
                    wrapperClassName="form-field mb-0"
                  />
                </div>
              </TableCell>
              <TableCell>
                <a
                  href="#"
                  className="text-destructive"
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
        <div className="pl-2">
          <Button
            variant={'outline'}
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
            <span>{_('Add product')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
