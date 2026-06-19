import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@components/common/ui/Select.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues,
  Controller
} from 'react-hook-form';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps<T extends FieldValues = FieldValues> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  options: SelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
  className?: string;
  disabled?: boolean;
  defaultValue?: string | number;
  id?: string;
  onChange?: (value: string | number) => void;
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
  disabled,
  id,
  onChange: onChangeCallback
}: SelectFieldProps<T>) {
  const {
    control,
    formState: { errors }
  } = useFormContext<T>();
  const resolvedName = useScopedFieldName(name) as FieldPath<T>;

  const fieldError = getNestedError(resolvedName, errors, error);
  const fieldId = id || `field-${resolvedName}`;

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
      <Controller
        name={resolvedName}
        control={control}
        rules={validationRules}
        defaultValue={hasDefaultValue ? defaultValue : ('' as any)}
        render={({ field }) => (
          <Select
            value={options.find((o) => o.value === field.value) ?? null}
            onValueChange={(value) => {
              const newValue = value?.value === '' ? '' : value?.value;
              field.onChange(newValue);
              if (onChangeCallback && value !== null) {
                onChangeCallback(value.value);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger
              id={fieldId}
              className={className}
              aria-invalid={fieldError !== undefined ? 'true' : 'false'}
              aria-describedby={
                fieldError !== undefined ? `${fieldId}-error` : undefined
              }
            >
              <SelectValue>
                {options.find((o) => String(o.value) === String(field.value))
                  ?.label || placeholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {placeholder && (
                <SelectItem value="" disabled>
                  {placeholder}
                </SelectItem>
              )}
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
