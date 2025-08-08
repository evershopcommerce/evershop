import React from 'react';
import { useFormContext, RegisterOptions } from 'react-hook-form';
import { _ } from '../../../lib/locale/translate/_.js';
import { Tooltip } from './Tooltip.js';
import { getNestedError } from './utils/getNestedError.js';

interface EmailFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: string;
  error?: string;
  helperText?: string;
  validation?: RegisterOptions;
  onChange?: (value: string) => void;
  wrapperClassName?: string;
}

export function EmailField({
  name,
  label,
  placeholder,
  className = '',
  wrapperClassName = 'form-field',
  required = false,
  disabled = false,
  defaultValue,
  error,
  helperText,
  validation,
  onChange,
  ...props
}: EmailFieldProps) {
  const {
    register,
    unregister,
    formState: { errors }
  } = useFormContext();
  const fieldError = getNestedError(name, errors, error);

  React.useEffect(() => {
    return () => {
      unregister(name);
    };
  }, [name, unregister]);
  const fieldId = `field-${name}`;

  const validationRules: RegisterOptions = {};

  if (defaultValue !== undefined) {
    validationRules.value = defaultValue;
  }

  if (validation) {
    Object.assign(validationRules, validation);
  }

  if (required && !validationRules.required) {
    validationRules.required = _('${field} is required', {
      field: label || 'This field'
    });
  }

  if (!validationRules.pattern) {
    validationRules.pattern = {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: _('Please enter a valid email address')
    };
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
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
        type="email"
        placeholder={placeholder}
        disabled={disabled}
        className={`${fieldError !== undefined ? 'error' : ''} ${
          className || ''
        }`}
        aria-invalid={fieldError !== undefined ? 'true' : 'false'}
        aria-describedby={
          fieldError !== undefined ? `${fieldId}-error` : undefined
        }
        {...register(name, validationRules)}
        onChange={(e) => {
          register(name).onChange(e);
          handleChange(e);
        }}
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
