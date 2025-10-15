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

interface CheckboxOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface CheckboxFieldProps<T extends FieldValues = FieldValues>
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'name' | 'type' | 'defaultValue'
  > {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  options?: CheckboxOption[];
  defaultValue?: boolean | (string | number)[];
  direction?: 'horizontal' | 'vertical';
  wrapperClassName?: string;
}

export function CheckboxField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  wrapperClassName,
  helperText,
  required,
  validation,
  options,
  defaultValue,
  direction = 'vertical',
  className,
  disabled,
  ...props
}: CheckboxFieldProps<T>) {
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
    direction === 'horizontal' ? 'checkbox-group horizontal' : 'checkbox-group';

  if (!options || options.length === 0) {
    return (
      <div
        className={`form-field ${wrapperClassName} ${
          fieldError ? 'error' : ''
        }`}
      >
        <div className={containerClass}>
          <div className="checkbox-item">
            <Controller
              name={name}
              control={control}
              rules={validationRules}
              defaultValue={defaultValue as any}
              render={({ field }) => (
                <input
                  type="checkbox"
                  id={fieldId}
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  onBlur={field.onBlur}
                  disabled={disabled}
                  className={className}
                  aria-invalid={fieldError !== undefined ? 'true' : 'false'}
                  aria-describedby={
                    fieldError !== undefined
                      ? `${fieldId}-error`
                      : helperText
                      ? `${fieldId}-helper`
                      : undefined
                  }
                  {...props}
                />
              )}
            />
            {label && (
              <label htmlFor={fieldId}>
                {label}
                {required && <span className="required-indicator">*</span>}
                {helperText && <Tooltip content={helperText} position="top" />}
              </label>
            )}
          </div>
        </div>

        {fieldError && (
          <p id={`${fieldId}-error`} className="field-error">
            {fieldError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${wrapperClassName} ${fieldError ? 'error' : ''}`}>
      {label && (
        <fieldset>
          <legend>
            {label}
            {required && <span className="required-indicator">*</span>}
            {helperText && <Tooltip content={helperText} position="top" />}
          </legend>

          <Controller
            name={name}
            control={control}
            rules={validationRules}
            defaultValue={defaultValue as any}
            render={({ field }) => (
              <div className={containerClass}>
                {options.map((option, index) => {
                  const isChecked = Array.isArray(field.value)
                    ? field.value.includes(option.value)
                    : false;

                  return (
                    <div key={option.value} className="checkbox-item">
                      <input
                        type="checkbox"
                        id={`${fieldId}-${index}`}
                        value={option.value}
                        disabled={disabled || option.disabled}
                        checked={isChecked}
                        onChange={(e) => {
                          const currentValues = Array.isArray(field.value)
                            ? field.value
                            : [];
                          if (e.target.checked) {
                            field.onChange([...currentValues, option.value]);
                          } else {
                            field.onChange(
                              currentValues.filter(
                                (val) => val !== option.value
                              )
                            );
                          }
                        }}
                        onBlur={field.onBlur}
                        className={className}
                        aria-invalid={fieldError ? 'true' : 'false'}
                        aria-describedby={
                          fieldError ? `${fieldId}-error` : undefined
                        }
                        {...props}
                      />
                      <label
                        htmlFor={`${fieldId}-${index}`}
                        className={option.disabled ? 'disabled' : ''}
                      >
                        {option.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          />
        </fieldset>
      )}

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
