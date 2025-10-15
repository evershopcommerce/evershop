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

interface ColorFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  defaultValue?: string;
  wrapperClassName?: string;
}

export function ColorField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  wrapperClassName,
  helperText,
  required,
  validation,
  defaultValue,
  className,
  ...props
}: ColorFieldProps<T>) {
  const {
    register,
    formState: { errors },
    watch,
    setValue
  } = useFormContext<T>();

  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;
  const value = watch(name) || '#000000';

  const { valueAsNumber, valueAsDate, ...cleanValidation } = validation || {};
  const validationRules = {
    ...cleanValidation,
    ...(required &&
      !validation?.required && {
        required: _('${field} is required', { field: label || name })
      }),
    pattern: validation?.pattern || {
      value: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      message: _('Please enter a valid hex color')
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(name, e.target.value as any);
  };

  return (
    <div
      className={`form-field ${wrapperClassName} ${fieldError ? 'error' : ''}`}
    >
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required-indicator">*</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </label>
      )}

      <div className="color-input-group">
        <input
          id={fieldId}
          type="color"
          {...register(name, validationRules)}
          className={`color-picker ${className || ''}`}
          aria-invalid={fieldError ? 'true' : 'false'}
          aria-describedby={fieldError ? `${fieldId}-error` : undefined}
          {...props}
        />

        <input
          type="text"
          value={value}
          placeholder="#000000"
          onChange={handleTextChange}
          className="color-input"
          aria-invalid={fieldError ? 'true' : 'false'}
        />
      </div>

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
