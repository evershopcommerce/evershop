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

interface EmailFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
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

export function EmailField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  required,
  validation,
  wrapperClassName,
  className,
  defaultValue,
  prefixIcon,
  suffixIcon,
  ...props
}: EmailFieldProps<T>) {
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
      }),
    pattern: validation?.pattern || {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: _('Please enter a valid email address')
    }
  };

  const renderInput = () => (
    <Controller
      name={resolvedName}
      control={control}
      defaultValue={defaultValue as any}
      rules={validationRules}
      render={({ field }) => (
        <InputGroupInput
          {...field}
          value={field.value ?? ''}
          id={fieldId}
          type="email"
          aria-invalid={fieldError !== undefined ? 'true' : 'false'}
          aria-describedby={
            fieldError !== undefined ? `${fieldId}-error` : undefined
          }
          {...props}
        />
      )}
    />
  );

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
