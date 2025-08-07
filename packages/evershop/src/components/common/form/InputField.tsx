import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues
} from 'react-hook-form';
import { _ } from '../../../lib/locale/translate/_.js';
import { Tooltip } from './Tooltip.js';
import { getNestedError } from './utils/getNestedError.js';

interface InputFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
}

export function InputField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  required,
  validation,
  wrapperClassName = 'form-field',
  className,
  type = 'text',
  ...props
}: InputFieldProps<T>) {
  const {
    register,
    formState: { errors }
  } = useFormContext<T>();

  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;

  const validationRules = {
    ...validation,
    ...(required &&
      !validation?.required && {
        required: _('${field} is required', { field: label || name })
      })
  };

  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required-indicator">*</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </label>
      )}

      <input
        id={fieldId}
        type={type}
        {...register(name, validationRules)}
        className={`${fieldError !== undefined ? 'error' : ''} ${
          className || ''
        }`}
        aria-invalid={fieldError !== undefined ? 'true' : 'false'}
        aria-describedby={
          fieldError !== undefined ? `${fieldId}-error` : undefined
        }
        {...props}
      />

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
