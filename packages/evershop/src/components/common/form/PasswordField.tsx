import React from 'react';
import { useFormContext, RegisterOptions } from 'react-hook-form';
import { _ } from '../../../lib/locale/translate/_.js';
import { Tooltip } from './Tooltip.js';
import { getNestedError } from './utils/getNestedError.js';

interface PasswordFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  showToggle?: boolean;
  error?: string;
  helperText?: string;
  validation?: RegisterOptions;
  onChange?: (value: string) => void;
  wrapperClassName?: string;
}

export function PasswordField({
  name,
  label,
  placeholder,
  className = '',
  wrapperClassName = 'form-field',
  required = false,
  disabled = false,
  minLength = 6,
  showToggle = false,
  error,
  helperText,
  validation,
  onChange,
  ...props
}: PasswordFieldProps) {
  const {
    register,
    unregister,
    formState: { errors }
  } = useFormContext();

  React.useEffect(() => {
    return () => {
      unregister(name);
    };
  }, [name, unregister]);
  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;
  const [showPassword, setShowPassword] = React.useState(false);

  const validationRules: RegisterOptions = {};

  if (validation) {
    Object.assign(validationRules, validation);
  }

  if (required && !validationRules.required) {
    validationRules.required = _('${field} is required', {
      field: label || 'This field'
    });
  }

  if (!validationRules.minLength) {
    validationRules.minLength = {
      value: minLength,
      message: _('Password must be at least ${minLength} characters long', {
        minLength: minLength.toString()
      })
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
      <div className="relative">
        <input
          id={fieldId}
          type={showToggle && showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          disabled={disabled}
          className={`${fieldError !== undefined ? 'error' : ''} ${
            showToggle ? 'pr-10' : ''
          } ${className || ''}`}
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
        {showToggle && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
