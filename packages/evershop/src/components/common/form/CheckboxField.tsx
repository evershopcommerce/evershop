import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { useScopedFieldName } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Checkbox } from '@components/common/ui/Checkbox.js';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend
} from '@components/common/ui/Field.js';
import { Label } from '@components/common/ui/Label.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues,
  Controller
} from 'react-hook-form';

interface CheckboxOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface CheckboxFieldProps<T extends FieldValues = FieldValues>
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'name' | 'type' | 'defaultValue'
  > {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  options?: CheckboxOption[];
  defaultValue?: boolean | (string | number)[];
  direction?: 'horizontal' | 'vertical';
  wrapperClassName?: string;
}

export function CheckboxField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  wrapperClassName,
  helperText,
  required,
  validation,
  options,
  defaultValue,
  direction = 'vertical',
  className,
  disabled,
  ...props
}: CheckboxFieldProps<T>) {
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
  const containerClass =
    direction === 'horizontal' ? 'checkbox-group horizontal' : 'checkbox-group';

  if (!options || options.length === 0) {
    return (
      <Field
        data-invalid={fieldError ? 'true' : 'false'}
        className={wrapperClassName}
      >
        <div className="flex items-center gap-2">
          <Controller
            name={resolvedName}
            control={control}
            rules={validationRules}
            defaultValue={defaultValue as any}
            render={({ field }) => (
              <Checkbox
                id={fieldId}
                checked={!!field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
                onBlur={field.onBlur}
                disabled={disabled}
                className={className}
                aria-invalid={fieldError !== undefined ? 'true' : 'false'}
                aria-describedby={
                  fieldError !== undefined
                    ? `${fieldId}-error`
                    : helperText
                    ? `${fieldId}-helper`
                    : undefined
                }
              />
            )}
          />
          {label && (
            <FieldLabel
              htmlFor={fieldId}
              className="text-sm font-normal cursor-pointer"
            >
              {label}
              {required && <span className="text-destructive">*</span>}
              {helperText && <Tooltip content={helperText} position="top" />}
            </FieldLabel>
          )}
        </div>

        {fieldError && <FieldError>{fieldError}</FieldError>}
      </Field>
    );
  }

  return (
    <Field
      data-invalid={fieldError ? 'true' : 'false'}
      className={wrapperClassName}
    >
      {label && (
        <fieldset>
          <FieldLegend>
            <>
              {label}
              {required && <span className="text-destructive">*</span>}
              {helperText && <Tooltip content={helperText} position="top" />}
            </>
          </FieldLegend>

          <Controller
            name={resolvedName}
            control={control}
            rules={validationRules}
            defaultValue={defaultValue as any}
            render={({ field }) => (
              <div className={containerClass}>
                {options.map((option, index) => {
                  const isChecked = Array.isArray(field.value)
                    ? field.value.includes(option.value)
                    : false;

                  return (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${fieldId}-${index}`}
                        disabled={disabled || option.disabled}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const currentValues = Array.isArray(field.value)
                            ? field.value
                            : [];
                          if (checked) {
                            field.onChange([...currentValues, option.value]);
                          } else {
                            field.onChange(
                              currentValues.filter(
                                (val) => val !== option.value
                              )
                            );
                          }
                        }}
                        onBlur={field.onBlur}
                        className={className}
                        aria-invalid={fieldError ? 'true' : 'false'}
                        aria-describedby={
                          fieldError ? `${fieldId}-error` : undefined
                        }
                      />
                      <Label
                        htmlFor={`${fieldId}-${index}`}
                        className={`text-sm cursor-pointer ${
                          option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          />
        </fieldset>
      )}

      {fieldError && <FieldError>{fieldError}</FieldError>}
    </Field>
  );
}
