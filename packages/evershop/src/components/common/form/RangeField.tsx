import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues
} from 'react-hook-form';

interface RangeFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  showValue?: boolean;
  defaultValue?: number;
  wrapperClassName?: string;
}

export function RangeField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  wrapperClassName,
  helperText,
  required,
  validation,
  showValue = true,
  defaultValue,
  className,
  min = 0,
  max = 100,
  step = 1,
  ...props
}: RangeFieldProps<T>) {
  const {
    register,
    formState: { errors },
    watch
  } = useFormContext<T>();

  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;
  const value = watch(name) || min;
  const { valueAsDate, pattern, ...cleanValidation } = validation || {};
  const validationRules = {
    ...cleanValidation,
    ...(required && {
      required: _('${field} is required', { field: label || name })
    }),
    valueAsNumber: true
  } as const;

  return (
    <div
      className={`form-field ${wrapperClassName} ${fieldError ? 'error' : ''}`}
    >
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required-indicator">*</span>}
          {showValue && <span className="range-value">({value})</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </label>
      )}

      <input
        id={fieldId}
        type="range"
        min={min}
        max={max}
        step={step}
        {...register(name, validationRules)}
        className={className}
        aria-invalid={fieldError !== undefined ? 'true' : 'false'}
        aria-describedby={
          fieldError !== undefined ? `${fieldId}-error` : undefined
        }
        {...props}
      />

      <div className="range-labels">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
