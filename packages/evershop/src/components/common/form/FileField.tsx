import { Tooltip } from '@components/common/form/Tooltip.js';
import { getNestedError } from '@components/common/form/utils/getNestedError.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  useFormContext,
  RegisterOptions,
  FieldPath,
  FieldValues
} from 'react-hook-form';

interface FileFieldProps<T extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  name: FieldPath<T>;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validation?: RegisterOptions<T>;
  maxSize?: number;
  wrapperClassName?: string;
}

export function FileField<T extends FieldValues = FieldValues>({
  name,
  label,
  error,
  wrapperClassName,
  helperText,
  required,
  validation,
  maxSize,
  className,
  accept,
  multiple = false,
  ...props
}: FileFieldProps<T>) {
  const {
    register,
    formState: { errors },
    watch
  } = useFormContext<T>();

  const fieldError = getNestedError(name, errors, error);
  const fieldId = `field-${name}`;
  const files = watch(name);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const { valueAsNumber, valueAsDate, ...cleanValidation } = validation || {};
  const validationRules = {
    ...cleanValidation,
    ...(required &&
      !validation?.required && {
        required: _('${field} is required', { field: label || name })
      }),
    validate: {
      ...validation?.validate,
      fileSize: (fileList) => {
        if (!maxSize || !fileList || fileList.length === 0) return true;
        for (let i = 0; i < fileList.length; i++) {
          if (fileList[i].size > maxSize) {
            return _('File size must be less than ${maxSize}', {
              maxSize: formatFileSize(maxSize)
            });
          }
        }
        return true;
      }
    }
  };

  return (
    <div
      className={`form-field ${wrapperClassName} ${fieldError ? 'error' : ''}`}
    >
      {label && (
        <label htmlFor={fieldId}>
          {label}
          {required && <span className="required-indicator">*</span>}
          {helperText && <Tooltip content={helperText} position="top" />}
        </label>
      )}

      <input
        id={fieldId}
        type="file"
        accept={accept}
        multiple={multiple}
        {...register(name, validationRules)}
        className={className}
        aria-invalid={fieldError !== undefined ? 'true' : 'false'}
        aria-describedby={
          fieldError !== undefined ? `${fieldId}-error` : undefined
        }
        {...props}
      />

      {maxSize && (
        <p className="file-size-hint">
          Maximum file size: {formatFileSize(maxSize)}
        </p>
      )}

      {files && files.length > 0 && (
        <div className="file-list">
          <p className="file-list-label">Selected files:</p>
          <ul className="file-items">
            {Array.from(files as FileList).map((file: File, index) => (
              <li key={index}>
                {file.name} ({formatFileSize(file.size)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {fieldError && (
        <p id={`${fieldId}-error`} className="field-error">
          {fieldError}
        </p>
      )}
    </div>
  );
}
