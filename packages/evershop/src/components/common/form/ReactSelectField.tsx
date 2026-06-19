import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { cn } from '@evershop/evershop/lib/util/cn';
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
  const {
    control,
    formState: { errors }
  } = useFormContext<T>();
  const resolvedName = useScopedFieldName(name) as FieldPath<T>;
  const fieldError = getNestedError(resolvedName, errors, error);
  const fieldId = `field-${resolvedName}`;

  const validationRules = {
    ...validation,
    ...(required &&
      !validation?.required && {
        required: _('${field} is required', { field: label || name })
      })
  };

  return (
    <Field
      data-invalid={fieldError ? 'true' : 'false'}
      className={wrapperClassName}
      id={fieldId}
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

      <Controller
        name={resolvedName}
        control={control}
        rules={validationRules}
        defaultValue={defaultValue}
        render={({ field }) => (
          <Select
            {...field}
            {...selectProps}
            inputId={fieldId}
            options={options}
            isMulti={isMulti}
            className={cn(className)}
            value={
              isMulti
                ? options.filter((option) =>
                    (field.value || defaultValue || [])?.includes(option.value)
                  )
                : options.find(
                    (option) => option.value === (field.value ?? defaultValue)
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
                  selectedOption ? (selectedOption as SelectOption).value : null
                );
              }
            }}
            classNamePrefix="react-select"
            aria-invalid={fieldError !== undefined ? 'true' : 'false'}
            aria-describedby={
              fieldError !== undefined ? `${fieldId}-error` : undefined
            }
            classNames={{
              control: (state) =>
                cn(
                  'min-h-auto border border-input rounded-md shadow-xs transition-[color,box-shadow]',
                  state.isFocused && 'border-ring ring-[3px] ring-ring/50',
                  fieldError &&
                    'border-destructive ring-[3px] ring-destructive/20'
                ),
              input: () => 'outline-none shadow-none',
              menu: () => 'bg-popover border border-input rounded-md shadow-md',
              option: (state) =>
                cn(
                  'px-3 py-2 cursor-pointer',
                  state.isSelected && 'bg-primary text-primary-foreground',
                  state.isFocused && !state.isSelected && 'bg-accent'
                )
            }}
          />
        )}
      />
      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
