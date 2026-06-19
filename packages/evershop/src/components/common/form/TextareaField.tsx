import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import { Textarea } from '@components/common/ui/Textarea.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues,
  Controller
} from 'react-hook-form';

interface TextareaFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
}

export function TextareaField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  wrapperClassName,
  required,
  validation,
  className,
  rows = 4,
  defaultValue,
  ...props
}: TextareaFieldProps<T>) {
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
          <Textarea
            {...field}
            id={fieldId}
            rows={rows}
            className={`${fieldError !== undefined ? 'error' : ''} ${
              className || ''
            }`}
            aria-invalid={fieldError !== undefined ? 'true' : 'false'}
            aria-describedby={
              fieldError !== undefined ? `${fieldId}-error` : undefined
            }
            {...props}
          />
        )}
      />

      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
