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

interface TextareaFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
}

export function TextareaField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  wrapperClassName,
  required,
  validation,
  className,
  rows = 4,
  ...props
}: TextareaFieldProps<T>) {
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
    <div className={`form-field ${wrapperClassName}`}>
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required-indicator">*</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </label>
      )}

      <textarea
        id={fieldId}
        rows={rows}
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
