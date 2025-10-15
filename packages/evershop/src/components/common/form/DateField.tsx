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

interface DateFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
}

export function DateField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  wrapperClassName,
  helperText,
  required,
  validation,
  className,
  min,
  max,
  ...props
}: DateFieldProps<T>) {
  const {
    register,
    unregister,
    formState: { errors }
  } = useFormContext<T>();

  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;

  React.useEffect(() => {
    return () => {
      unregister(name);
    };
  }, [name, unregister]);

  const { valueAsNumber, ...cleanValidation } = validation || {};
  const validationRules = {
    ...cleanValidation,
    ...(required && {
      required: _('${field} is required', { field: label || name })
    }),
    validate: {
      ...validation?.validate,
      minDate: (value) => {
        if (!min || !value) return true;
        return (
          value >= min ||
          _('Date must be after ${min}', { min: min.toString() })
        );
      },
      maxDate: (value) => {
        if (!max || !value) return true;
        return (
          value <= max ||
          _('Date must be before ${max}', { max: max.toString() })
        );
      }
    }
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

      <input
        id={fieldId}
        type="date"
        min={min}
        max={max}
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
