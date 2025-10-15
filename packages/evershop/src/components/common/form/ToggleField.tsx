import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
  useFormContext
} from 'react-hook-form';

interface ToggleFieldProps<T extends FieldValues = FieldValues> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
  disabled?: boolean;
  defaultValue?: boolean | 0 | 1;
  trueValue?: boolean | 1;
  falseValue?: boolean | 0;
  trueLabel?: string;
  falseLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onChange?: (value: boolean | 0 | 1) => void;
}

export function ToggleField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  required,
  validation,
  wrapperClassName,
  disabled = false,
  defaultValue = false,
  trueValue = true,
  falseValue = false,
  trueLabel = 'Yes',
  falseLabel = 'No',
  size = 'md',
  variant = 'default',
  onChange
}: ToggleFieldProps<T>) {
  const {
    control,
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

  const sizeClasses = {
    sm: {
      toggle: 'h-5 w-9',
      thumb: 'h-4 w-4',
      text: 'text-sm'
    },
    md: {
      toggle: 'h-6 w-11',
      thumb: 'h-5 w-5',
      text: 'text-base'
    },
    lg: {
      toggle: 'h-7 w-14',
      thumb: 'h-6 w-6',
      text: 'text-lg'
    }
  };

  const variantClasses = {
    default: {
      active: 'bg-blue-600',
      inactive: 'bg-gray-200'
    },
    success: {
      active: 'bg-green-600',
      inactive: 'bg-gray-200'
    },
    warning: {
      active: 'bg-yellow-600',
      inactive: 'bg-gray-200'
    },
    danger: {
      active: 'bg-red-600',
      inactive: 'bg-gray-200'
    }
  };

  const sizeClass = sizeClasses[size];
  const variantClass = variantClasses[variant];

  return (
    <div className={`form-field ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block mb-2 font-medium text-gray-700"
        >
          {label}
          {required && <span className="required-indicator">*</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        rules={validationRules}
        defaultValue={defaultValue as any}
        render={({ field }) => {
          const isActive = field.value === trueValue;

          return (
            <div className={fieldError ? 'error' : ''}>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  aria-labelledby={`${fieldId}-label`}
                  disabled={disabled}
                  onClick={() => {
                    field.onChange(isActive ? falseValue : trueValue);
                    onChange?.(isActive ? falseValue : trueValue);
                  }}
                  className={`
                    relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${sizeClass.toggle}
                    ${isActive ? variantClass.active : variantClass.inactive}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${fieldError ? 'ring-2 ring-red-500' : ''}
                  `}
                >
                  <span className="sr-only">{label || 'Toggle'}</span>
                  <span
                    aria-hidden="true"
                    className={`
                      pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 
                      transition duration-200 ease-in-out
                      ${sizeClass.thumb}
                      ${isActive ? 'translate-x-5' : 'translate-x-0'}
                    `}
                    style={{
                      transform: isActive
                        ? `translateX(${
                            size === 'sm'
                              ? '1.25rem'
                              : size === 'md'
                              ? '1.25rem'
                              : '1.75rem'
                          })`
                        : 'translateX(0)'
                    }}
                  />
                </button>

                <div
                  className={`flex items-center space-x-4 ${sizeClass.text}`}
                >
                  <span
                    className={`font-medium ${
                      isActive ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {isActive ? trueLabel : falseLabel}
                  </span>
                </div>
              </div>
              <input type="hidden" name={name} value={String(field.value)} />
            </div>
          );
        }}
      />

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
