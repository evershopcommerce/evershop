import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import { Switch } from '@components/common/ui/Switch.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
  useFormContext
} from 'react-hook-form';

interface ToggleFieldProps<T extends FieldValues = FieldValues> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
  disabled?: boolean;
  defaultValue?: boolean | 0 | 1;
  trueValue?: boolean | 1;
  falseValue?: boolean | 0;
  trueLabel?: string;
  falseLabel?: string;
  size?: 'sm' | 'default';
  onChange?: (value: boolean | 0 | 1) => void;
}

export function ToggleField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  required,
  validation,
  wrapperClassName,
  disabled = false,
  defaultValue = false,
  trueValue = true,
  falseValue = false,
  trueLabel = 'Yes',
  falseLabel = 'No',
  size = 'default',
  onChange
}: ToggleFieldProps<T>) {
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
        <FieldLabel htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </FieldLabel>
      )}

      <Controller
        name={resolvedName}
        control={control}
        rules={validationRules}
        defaultValue={defaultValue as any}
        render={({ field }) => {
          const isActive = field.value === trueValue;

          return (
            <div className="flex items-center gap-3">
              <Switch
                id={fieldId}
                size={size}
                checked={isActive}
                onCheckedChange={(checked) => {
                  const newValue = checked ? trueValue : falseValue;
                  field.onChange(newValue);
                  onChange?.(newValue);
                }}
                disabled={disabled}
                aria-invalid={fieldError ? 'true' : 'false'}
                aria-describedby={fieldError ? `${fieldId}-error` : undefined}
              />
              <span className="text-sm text-muted-foreground">
                {isActive ? trueLabel : falseLabel}
              </span>
            </div>
          );
        }}
      />

      {fieldError && (
        <FieldError id={`${fieldId}-error`}>{fieldError}</FieldError>
      )}
    </Field>
  );
}
