import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
  useFormContext
} from 'react-hook-form';
import CreatableSelect, { CreatableProps } from 'react-select/creatable';

interface SelectOption {
  value: any;
  label: string;
  [key: string]: any;
}

interface ReactSelectCreatableFieldProps<T extends FieldValues = FieldValues>
  extends Omit<
    CreatableProps<SelectOption, boolean, any>,
    'name' | 'value' | 'onChange'
  > {
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
  onCreateOption?: (inputValue: string) => void;
  formatCreateLabel?: (inputValue: string) => string;
}

export function ReactSelectCreatableField<T extends FieldValues = FieldValues>({
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
  onCreateOption,
  formatCreateLabel = (inputValue: string) => `Create "${inputValue}"`,
  ...selectProps
}: ReactSelectCreatableFieldProps<T>) {
  const { control, unregister } = useFormContext<T>();
  const fieldId = `field-${name}`;

  const [dynamicOptions, setDynamicOptions] =
    React.useState<SelectOption[]>(options);

  React.useEffect(() => {
    setDynamicOptions(options);
  }, [options]);

  React.useEffect(() => {
    return () => {
      unregister(name);
    };
  }, [name, unregister]);

  const validationRules = {
    ...validation,
    ...(required && {
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

          const handleCreateOption = (inputValue: string) => {
            const newOption = {
              value: inputValue.toLowerCase().replace(/\W/g, ''),
              label: inputValue
            };
            const optionExists = dynamicOptions.some(
              (option) =>
                option.value === newOption.value ||
                option.label === newOption.label
            );

            if (!optionExists) {
              setDynamicOptions((prev) => {
                const updated = [...prev, newOption];
                return updated;
              });
            }

            if (onCreateOption) {
              onCreateOption(inputValue);
            }

            if (isMulti) {
              const currentValues = (field.value as any[]) || [];
              if (!currentValues.includes(newOption.value)) {
                const newValues = [...currentValues, newOption.value];
                field.onChange(newValues);
              }
            } else {
              field.onChange(newOption.value);
            }
          };

          return (
            <div className={fieldError !== undefined ? 'error' : ''}>
              <CreatableSelect
                {...field}
                {...selectProps}
                inputId={fieldId}
                options={dynamicOptions}
                isMulti={isMulti}
                formatCreateLabel={formatCreateLabel}
                onCreateOption={handleCreateOption}
                value={
                  isMulti
                    ? dynamicOptions.filter((option) =>
                        field.value?.includes(option.value)
                      )
                    : dynamicOptions.find(
                        (option) => option.value === field.value
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
