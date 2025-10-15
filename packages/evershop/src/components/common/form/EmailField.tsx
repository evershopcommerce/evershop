import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFormContext, RegisterOptions } from 'react-hook-form';

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
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export function EmailField({
  name,
  label,
  placeholder,
  className = '',
  wrapperClassName,
  required = false,
  disabled = false,
  defaultValue,
  error,
  helperText,
  validation,
  onChange,
  prefixIcon,
  suffixIcon,
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

  const hasIcons = prefixIcon || suffixIcon;
  const inputClassName = `${fieldError !== undefined ? 'error' : ''} ${
    className || ''
  } ${hasIcons ? '!pr-3' : ''} ${prefixIcon ? '!pl-10' : ''} ${
    suffixIcon ? '!pr-10' : ''
  }`.trim();

  const renderInput = () => (
    <input
      id={fieldId}
      type="email"
      placeholder={placeholder}
      disabled={disabled}
      className={inputClassName}
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
  );

  return (
    <div className={`form-field ${wrapperClassName || ''}`.trim()}>
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required-indicator">*</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </label>
      )}

      {hasIcons ? (
        <div
          className={`input__wrapper relative flex group items-center`.trim()}
        >
          {prefixIcon && (
            <div className="prefix absolute left-3 z-10 flex items-center justify-center">
              {prefixIcon}
            </div>
          )}
          {renderInput()}
          {suffixIcon && (
            <div className="suffix absolute right-3 z-10 flex items-center justify-center">
              {suffixIcon}
            </div>
          )}
        </div>
      ) : (
        renderInput()
      )}

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
