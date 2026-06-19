import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Field, FieldError, FieldLabel } from '@components/common/ui/Field.js';
import {
  InputGroup,
  InputGroupAddon,
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
  defaultValue,
  ...props
}: InputFieldProps<T>) {
  const {
    control,
    formState: { errors }
  } = useFormContext<T>();
  // Resolves to `name` unchanged outside the page builder; inside a
  // WidgetSettingsScope the path is prefixed with `block.<uid>.` so the
  // same field component participates in the page-level form.
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

  const renderInput = () => (
    <Controller
      name={resolvedName}
      control={control}
      defaultValue={(defaultValue ?? '') as any}
      rules={validationRules}
      render={({ field }) => (
        <InputGroupInput
          {...field}
          id={fieldId}
          type={type}
          aria-invalid={fieldError !== undefined ? 'true' : 'false'}
          aria-describedby={
            fieldError !== undefined ? `${fieldId}-error` : undefined
          }
          {...props}
        />
      )}
    />
  );

  // Special case: hidden inputs don't need labels or error messages
  if (type === 'hidden') {
    return (
      <div>
        {renderInput()}
        {fieldError && <FieldError>{fieldError}</FieldError>}
      </div>
    );
  }

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
      <InputGroup>
        {renderInput()}
        {prefixIcon && (
          <InputGroupAddon align={'inline-start'}>{prefixIcon}</InputGroupAddon>
        )}
        {suffixIcon && (
          <InputGroupAddon align={'inline-end'}>{suffixIcon}</InputGroupAddon>
        )}
      </InputGroup>
      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
