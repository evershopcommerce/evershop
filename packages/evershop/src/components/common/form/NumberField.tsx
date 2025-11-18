import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFormContext, RegisterOptions } from 'react-hook-form';

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
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export function NumberField({
  name,
  label,
  placeholder,
  className = '',
  wrapperClassName,
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
  prefixIcon,
  suffixIcon,
  ...props
}: NumberFieldProps) {
  const {
    register,
    formState: { errors }
  } = useFormContext();
  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;

  const validationRules: RegisterOptions = {
    setValueAs: (value) => {
      // Handle empty or null values
      if (value === '' || value === null || value === undefined) {
        return null;
      }

      // Convert string to number
      const numValue = allowDecimals ? parseFloat(value) : parseInt(value, 10);

      // Return null if conversion resulted in NaN
      return isNaN(numValue) ? null : numValue;
    }
  };

  if (defaultValue !== undefined && !isNaN(defaultValue)) {
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

  const hasIcons = prefixIcon || suffixIcon;
  const baseInputClassName = `${fieldError ? 'error' : ''} ${
    unit ? 'has-unit' : ''
  } ${className || ''}`;
  const iconInputClassName = `${fieldError !== undefined ? 'error' : ''} ${
    className || ''
  } ${hasIcons ? '!pr-3' : ''} ${prefixIcon ? '!pl-10' : ''} ${
    suffixIcon ? '!pr-10' : ''
  }`.trim();

  const renderInput = (useIconStyles = false) => (
    <input
      id={fieldId}
      type="number"
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={inputStep}
      className={useIconStyles ? iconInputClassName : baseInputClassName}
      aria-invalid={fieldError ? 'true' : 'false'}
      aria-describedby={fieldError ? `${fieldId}-error` : undefined}
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
          {renderInput(true)}
          {suffixIcon && (
            <div className="suffix absolute right-3 z-10 flex items-center justify-center">
              {suffixIcon}
            </div>
          )}
        </div>
      ) : unit ? (
        <div className="number-field-container">
          {unitPosition === 'left' && (
            <span className="number-unit">{unit}</span>
          )}
          {renderInput()}
          {unitPosition === 'right' && (
            <span className="number-unit">{unit}</span>
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
