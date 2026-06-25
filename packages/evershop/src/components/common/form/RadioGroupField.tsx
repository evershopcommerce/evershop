import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend
} from '@components/common/ui/Field.js';
import { Label } from '@components/common/ui/Label.js';
import {
  RadioGroup,
  RadioGroupItem
} from '@components/common/ui/RadioGroup.js';
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
    >
      {label && (
        <FieldLabel>
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
        defaultValue={defaultValue as any}
        render={({ field }) => (
          <RadioGroup
            value={String(field.value ?? '')}
            onValueChange={(value) => {
              const option = options.find((o) => String(o.value) === value);
              if (option) {
                field.onChange(option.value);
              }
            }}
            className={`${className} gap-1`}
            aria-invalid={fieldError !== undefined ? 'true' : 'false'}
            aria-describedby={
              fieldError !== undefined ? `${fieldId}-error` : undefined
            }
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem
                  value={String(option.value)}
                  id={`${fieldId}-${option.value}`}
                  disabled={disabled || option.disabled}
                />
                <FieldLabel
                  htmlFor={`${fieldId}-${option.value}`}
                  className={`text-sm font-normal cursor-pointer ${
                    option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {option.label}
                </FieldLabel>
              </div>
            ))}
          </RadioGroup>
        )}
      />

      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
