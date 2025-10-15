import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues,
  Controller
} from 'react-hook-form';

interface RadioOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface RadioGroupFieldProps<T extends FieldValues = FieldValues>
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'name' | 'type' | 'value' | 'checked' | 'onChange' | 'onBlur'
  > {
  name: FieldPath<T>;
  options: RadioOption[];
  label?: string;
  error?: string;
  helperText?: string;
  direction?: 'horizontal' | 'vertical';
  required?: boolean;
  disabled?: boolean;
  validation?: RegisterOptions<T>;
  defaultValue?: string | number;
  wrapperClassName?: string;
}

export function RadioGroupField<T extends FieldValues = FieldValues>({
  name,
  options,
  label,
  error,
  wrapperClassName,
  helperText,
  className = '',
  direction = 'vertical',
  required = false,
  disabled = false,
  validation,
  defaultValue,
  ...props
}: RadioGroupFieldProps<T>) {
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

  const containerClass =
    direction === 'horizontal' ? 'radio-group horizontal' : 'radio-group';

  return (
    <div
      className={`form-field ${wrapperClassName} ${fieldError ? 'error' : ''}`}
    >
      {label && (
        <fieldset>
          <legend>
            {label}
            {required && <span className="required-indicator">*</span>}
            {helperText && <Tooltip content={helperText} position="top" />}
          </legend>
        </fieldset>
      )}

      <Controller
        name={name}
        control={control}
        rules={validationRules}
        defaultValue={defaultValue as any}
        render={({ field }) => (
          <div className={containerClass}>
            {options.map((option) => (
              <div key={option.value} className="radio-item">
                <input
                  type="radio"
                  id={`${fieldId}-${option.value}`}
                  value={option.value}
                  disabled={disabled || option.disabled}
                  checked={field.value === option.value}
                  onChange={() => field.onChange(option.value)}
                  onBlur={field.onBlur}
                  className={className}
                  aria-invalid={fieldError !== undefined ? 'true' : 'false'}
                  aria-describedby={
                    fieldError !== undefined ? `${fieldId}-error` : undefined
                  }
                  {...props}
                />
                <label
                  htmlFor={`${fieldId}-${option.value}`}
                  className={option.disabled ? 'disabled' : ''}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        )}
      />

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
