import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import {
  InputGroup,
  InputGroupInput
} from '@components/common/ui/InputGroup.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues,
  Controller
} from 'react-hook-form';

interface TimeFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
}

export function TimeField<T extends FieldValues = FieldValues>({
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
  step,
  ...props
}: TimeFieldProps<T>) {
  const {
    control,
    formState: { errors }
  } = useFormContext<T>();
  const resolvedName = useScopedFieldName(name) as FieldPath<T>;

  const fieldError = getNestedError(resolvedName, errors, error);
  const fieldId = `field-${resolvedName}`;

  const { valueAsNumber, valueAsDate, ...cleanValidation } = validation || {};
  const validationRules = {
    ...cleanValidation,
    ...(required && {
      required: _('${field} is required', { field: label || name })
    }),
    validate: {
      ...validation?.validate,
      minTime: (value) => {
        if (!min || !value) return true;
        return (
          value >= min ||
          _('Time must be after ${min}', { min: min.toString() })
        );
      },
      maxTime: (value) => {
        if (!max || !value) return true;
        return (
          value <= max ||
          _('Time must be before ${max}', { max: max.toString() })
        );
      }
    }
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
        render={({ field }) => (
          <InputGroup>
            <InputGroupInput
              {...field}
              value={field.value ?? ''}
              id={fieldId}
              type="time"
              min={min}
              max={max}
              step={step}
              className={className}
              aria-invalid={fieldError !== undefined ? 'true' : 'false'}
              aria-describedby={
                fieldError !== undefined ? `${fieldId}-error` : undefined
              }
              {...props}
            />
          </InputGroup>
        )}
      />

      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
