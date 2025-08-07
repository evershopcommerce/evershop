import React from 'react';
import { useFormContext, RegisterOptions } from 'react-hook-form';
import { _ } from '../../../lib/locale/translate/_.js';
import { Tooltip } from './Tooltip.js';
import { getNestedError } from './utils/getNestedError.js';

interface NumberFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  allowDecimals?: boolean;
  unit?: string;
  unitPosition?: 'left' | 'right';
  defaultValue?: number;
  error?: string;
  helperText?: string;
  validation?: RegisterOptions;
  onChange?: (value: number | null) => void;
  wrapperClassName?: string;
}

export function NumberField({
  name,
  label,
  placeholder,
  className = '',
  wrapperClassName = 'form-field',
  required = false,
  disabled = false,
  min,
  max,
  step,
  allowDecimals = true,
  unit,
  unitPosition = 'right',
  defaultValue,
  error,
  helperText,
  validation,
  onChange,
  ...props
}: NumberFieldProps) {
  const {
    register,
    formState: { errors }
  } = useFormContext();
  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;

  const validationRules: RegisterOptions = {
    valueAsNumber: true
  };

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

  if (min !== undefined && !validationRules.min) {
    validationRules.min = {
      value: min,
      message: _('Value must be at least ${min}', { min: min.toString() })
    };
  }

  if (max !== undefined && !validationRules.max) {
    validationRules.max = {
      value: max,
      message: _('Value must be at most ${max}', { max: max.toString() })
    };
  }

  if (!allowDecimals && !validation?.validate) {
    validationRules.validate = (value) => {
      if (value === null || value === undefined || value === '') return true;
      return (
        Number.isInteger(Number(value)) || _('Value must be a whole number')
      );
    };
  } else if (
    !allowDecimals &&
    validation?.validate &&
    typeof validation.validate === 'object'
  ) {
    validationRules.validate = {
      ...validation.validate,
      isInteger: (value) => {
        if (value === null || value === undefined || value === '') return true;
        return (
          Number.isInteger(Number(value)) || _('Value must be a whole number')
        );
      }
    };
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    let numValue: number | null = null;

    if (inputValue !== '') {
      if (allowDecimals) {
        numValue = parseFloat(inputValue);
      } else {
        numValue = parseInt(inputValue, 10);
      }
    }

    if (onChange) {
      onChange(numValue);
    }
  };

  const inputStep = step !== undefined ? step : allowDecimals ? 'any' : '1';

  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required-indicator">*</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </label>
      )}

      {unit ? (
        <div className="number-field-container">
          {unitPosition === 'left' && (
            <span className="number-unit">{unit}</span>
          )}
          <input
            id={fieldId}
            type="number"
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={inputStep}
            className={`${fieldError ? 'error' : ''} ${
              unit ? 'has-unit' : ''
            } ${className || ''}`}
            aria-invalid={fieldError ? 'true' : 'false'}
            aria-describedby={fieldError ? `${fieldId}-error` : undefined}
            {...register(name, validationRules)}
            onChange={(e) => {
              register(name).onChange(e);
              handleChange(e);
            }}
            {...props}
          />
          {unitPosition === 'right' && (
            <span className="number-unit">{unit}</span>
          )}
        </div>
      ) : (
        <input
          id={fieldId}
          type="number"
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={inputStep}
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
      )}

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
