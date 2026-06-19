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
import { Eye, EyeClosed } from 'lucide-react';
import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues,
  Controller
} from 'react-hook-form';

interface PasswordFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  minLength?: number;
  showToggle?: boolean;
  validation?: RegisterOptions<T>;
  wrapperClassName?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export function PasswordField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  helperText,
  required,
  minLength = 6,
  showToggle = false,
  validation,
  wrapperClassName,
  className,
  defaultValue,
  prefixIcon,
  suffixIcon,
  ...props
}: PasswordFieldProps<T>) {
  const {
    control,
    formState: { errors }
  } = useFormContext<T>();
  const resolvedName = useScopedFieldName(name) as FieldPath<T>;

  const fieldError = getNestedError(resolvedName, errors, error);
  const fieldId = `field-${resolvedName}`;
  const [showPassword, setShowPassword] = React.useState(false);

  const validationRules = {
    ...validation,
    ...(required &&
      !validation?.required && {
        required: _('${field} is required', { field: label || name })
      }),
    minLength: validation?.minLength || {
      value: minLength,
      message: _('Password must be at least ${minLength} characters long', {
        minLength: minLength.toString()
      })
    }
  };

  const renderToggleButton = () =>
    showToggle ? (
      <button
        type="button"
        className="transition-colors"
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
      >
        {showPassword ? (
          <Eye className="h-5 w-5" />
        ) : (
          <EyeClosed className="h-5 w-5" />
        )}
      </button>
    ) : null;

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
          type={showToggle && showPassword ? 'text' : 'password'}
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
        {(suffixIcon || showToggle) && (
          <InputGroupAddon align={'inline-end'}>
            {suffixIcon || renderToggleButton()}
          </InputGroupAddon>
        )}
      </InputGroup>
      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
