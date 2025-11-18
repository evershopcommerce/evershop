import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
  useFormContext
} from 'react-hook-form';
import Select, { Props as ReactSelectProps } from 'react-select';

interface SelectOption {
  value: any;
  label: string;
  [key: string]: any;
}

interface ReactSelectFieldProps<T extends FieldValues = FieldValues>
  extends Omit<ReactSelectProps<SelectOption>, 'name' | 'value' | 'onChange'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  options: SelectOption[];
  className?: string;
  wrapperClassName?: string;
  defaultValue?: any;
}

export function ReactSelectField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  wrapperClassName = 'form-field',
  helperText,
  required,
  validation,
  options,
  className,
  isMulti = false,
  defaultValue,
  ...selectProps
}: ReactSelectFieldProps<T>) {
  const { control } = useFormContext<T>();
  const fieldId = `field-${name}`;

  const validationRules = {
    ...validation,
    ...(required &&
      !validation?.required && {
        required: _('${field} is required', { field: label || name })
      })
  };

  return (
    <div className={`${wrapperClassName} ${className || ''}`}>
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        rules={validationRules}
        defaultValue={defaultValue}
        render={({ field, fieldState }) => {
          const fieldError = error || fieldState.error?.message;
          return (
            <div className={fieldError !== undefined ? 'error' : ''}>
              <Select
                {...field}
                {...selectProps}
                inputId={fieldId}
                options={options}
                isMulti={isMulti}
                value={
                  isMulti
                    ? options.filter((option) =>
                        (field.value || defaultValue || [])?.includes(
                          option.value
                        )
                      )
                    : options.find(
                        (option) =>
                          option.value === (field.value ?? defaultValue)
                      ) || null
                }
                onChange={(selectedOption) => {
                  if (isMulti) {
                    const values = selectedOption
                      ? (selectedOption as SelectOption[]).map(
                          (option) => option.value
                        )
                      : [];
                    field.onChange(values);
                  } else {
                    field.onChange(
                      selectedOption
                        ? (selectedOption as SelectOption).value
                        : null
                    );
                  }
                }}
                classNamePrefix="react-select"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    minHeight: 'auto',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    boxShadow: 'none',
                    transition: 'border-color 0.15s ease-in-out',
                    '&:hover': {
                      borderColor: '#d1d5db'
                    },
                    ...(state.isFocused && {
                      borderColor: '#3b82f6',
                      boxShadow: '0 0 0 1px rgb(59, 130, 246)'
                    })
                  }),
                  input: (base) => ({
                    ...base,
                    '& input': {
                      boxShadow: 'none !important',
                      outline: 'none !important'
                    }
                  })
                }}
              />

              {fieldError && (
                <p id={`${fieldId}-error`} className="field-error">
                  {fieldError}
                </p>
              )}

              {helperText && !fieldError && (
                <p id={`${fieldId}-helper`} className="field-helper">
                  {helperText}
                </p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
