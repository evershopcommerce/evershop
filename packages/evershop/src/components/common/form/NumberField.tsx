import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@components/common/ui/InputGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFormContext, RegisterOptions, Controller } from 'react-hook-form';

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
    control,
    formState: { errors }
  } = useFormContext();
  const resolvedName = useScopedFieldName(name);
  const fieldError = getNestedError(resolvedName, errors, error);
  const fieldId = `field-${resolvedName}`;

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

  const inputStep = step !== undefined ? step : allowDecimals ? 'any' : '1';

  const inputClassName = `${fieldError ? 'error' : ''} ${
    unit ? 'has-unit' : ''
  } ${className || ''} ${prefixIcon ? '!pl-10' : ''} ${
    suffixIcon ? '!pr-10' : ''
  }`.trim();

  const renderInput = () => (
    <Controller
      name={resolvedName}
      control={control}
      defaultValue={defaultValue ?? null}
      rules={validationRules}
      render={({ field }) => (
        <InputGroupInput
          {...field}
          id={fieldId}
          type="number"
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={inputStep}
          className={inputClassName}
          aria-invalid={fieldError ? 'true' : 'false'}
          aria-describedby={fieldError ? `${fieldId}-error` : undefined}
          value={field.value ?? ''}
          onChange={(e) => {
            const inputValue = e.target.value;
            let numValue: number | null = null;

            if (inputValue !== '') {
              if (allowDecimals) {
                numValue = parseFloat(inputValue);
              } else {
                numValue = parseInt(inputValue, 10);
              }
              numValue = isNaN(numValue) ? null : numValue;
            }

            field.onChange(numValue);
            if (onChange) {
              onChange(numValue);
            }
          }}
          {...props}
        />
      )}
    />
  );

  return (
    <Field
      data-invalid={fieldError ? 'true' : 'false'}
      className={wrapperClassName}
    >
      {label && (
        <FieldLabel htmlFor={fieldId}>
          <>
            {label}
            {required && <span className="text-destructive">*</span>}
            {helperText && <Tooltip content={helperText} position="top" />}
          </>
        </FieldLabel>
      )}
      <InputGroup>
        {renderInput()}
        {prefixIcon && (
          <InputGroupAddon align={'inline-start'}>{prefixIcon}</InputGroupAddon>
        )}
        {suffixIcon && (
          <InputGroupAddon align={'inline-end'}>{suffixIcon}</InputGroupAddon>
        )}
        {unit && (
          <InputGroupAddon
            align={unitPosition === 'right' ? 'inline-end' : 'inline-start'}
          >
            {unit}
          </InputGroupAddon>
        )}
      </InputGroup>
      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
