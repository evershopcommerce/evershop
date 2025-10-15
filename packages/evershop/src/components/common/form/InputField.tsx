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

interface InputFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export function InputField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  required,
  validation,
  wrapperClassName,
  className,
  type = 'text',
  prefixIcon,
  suffixIcon,
  ...props
}: InputFieldProps<T>) {
  const {
    register,
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

  const hasIcons = prefixIcon || suffixIcon;
  const inputClassName = `${fieldError !== undefined ? 'error' : ''} ${
    className || ''
  } ${hasIcons ? '!pr-3' : ''} ${prefixIcon ? '!pl-10' : ''} ${
    suffixIcon ? '!pr-10' : ''
  }`.trim();

  const renderInput = () => (
    <input
      id={fieldId}
      type={type}
      {...register(name, validationRules)}
      className={inputClassName}
      aria-invalid={fieldError !== undefined ? 'true' : 'false'}
      aria-describedby={
        fieldError !== undefined ? `${fieldId}-error` : undefined
      }
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
