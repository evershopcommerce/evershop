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

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  options: SelectOption[];
  multiple?: boolean;
  placeholder?: string;
  wrapperClassName?: string;
}

export function SelectField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  required,
  validation,
  options,
  placeholder,
  wrapperClassName,
  className,
  defaultValue,
  multiple = false,
  ...props
}: SelectFieldProps<T>) {
  const {
    register,
    formState: { errors }
  } = useFormContext<T>();

  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;

  const hasDefaultValue =
    defaultValue !== undefined && defaultValue !== null && defaultValue !== '';

  const validationRules = {
    ...validation,
    ...(required &&
      !validation?.required && {
        required: {
          value: true,
          message: _('${field} is required', { field: label || name })
        },
        validate: {
          ...validation?.validate,
          notEmpty: (value) => {
            if (
              required &&
              (value === '' || value === null || value === undefined)
            ) {
              return _('${field} is required', { field: label || name });
            }
            return true;
          }
        }
      })
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

      <select
        id={fieldId}
        {...register(name, validationRules)}
        className={className}
        defaultValue={hasDefaultValue ? defaultValue : multiple ? [] : ''}
        aria-invalid={fieldError !== undefined ? 'true' : 'false'}
        aria-describedby={
          fieldError !== undefined
            ? `${fieldId}-error`
            : helperText
            ? `${fieldId}-helper`
            : undefined
        }
        multiple={multiple}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
