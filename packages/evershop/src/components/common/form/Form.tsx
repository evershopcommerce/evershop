import Button from '@components/common/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import {
  useForm,
  FormProvider,
  UseFormProps,
  FieldValues,
  SubmitHandler,
  UseFormReturn
} from 'react-hook-form';
import { toast } from 'react-toastify';

interface FormProps<T extends FieldValues = FieldValues>
  extends Omit<
    React.FormHTMLAttributes<HTMLFormElement>,
    'onSubmit' | 'onError'
  > {
  form?: UseFormReturn<T>;
  action?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  formOptions?: UseFormProps<T>;
  onSubmit?: SubmitHandler<T>;
  onSuccess?: (response: any, data: T) => void;
  onError?: (error: string, data: T) => void;
  successMessage?: string;
  errorMessage?: string;
  submitBtn?: boolean;
  submitBtnText?: string;
  loading?: boolean;
  children: React.ReactNode;
}

export function Form<T extends FieldValues = FieldValues>({
  form: externalForm,
  action,
  method = 'POST',
  formOptions,
  onSubmit,
  onSuccess,
  onError,
  successMessage = _('Saved successfully!'),
  errorMessage = _('Something went wrong! Please try again.'),
  submitBtn = true,
  submitBtnText = _('Save'),
  loading = false,
  children,
  className,
  noValidate = true,
  ...props
}: FormProps<T>) {
  const theForm =
    externalForm ||
    useForm<T>({
      shouldUnregister: true,
      ...formOptions
    });
  const {
    handleSubmit,
    formState: { isSubmitting }
  } = theForm;

  const defaultSubmit: SubmitHandler<T> = async (data) => {
    if (!action) {
      return;
    }
    try {
      const response = await fetch(action, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.error) {
        if (onError) {
          onError(result.error, data);
        } else {
          toast.error(result.error.message || errorMessage);
        }
      } else if (onSuccess) {
        onSuccess(result, data);
      } else {
        toast.success(successMessage);
      }
    } catch (error) {
      if (onError) {
        onError(
          errorMessage || (error instanceof Error ? error.message : ''),
          data
        );
      } else {
        toast.error(
          errorMessage || (error instanceof Error ? error.message : '')
        );
      }
    }
  };

  const handleFormSubmit = onSubmit || defaultSubmit;

  return (
    <FormProvider {...theForm}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={className}
        noValidate={noValidate}
        {...props}
      >
        <fieldset disabled={loading}>{children}</fieldset>

        {submitBtn && (
          <div className="mt-4">
            <Button
              title={submitBtnText}
              type="submit"
              onAction={() => {
                handleSubmit(handleFormSubmit);
              }}
              isLoading={isSubmitting || loading}
            />
          </div>
        )}
      </form>
    </FormProvider>
  );
}

export { useFormContext } from 'react-hook-form';
export { Controller } from 'react-hook-form';
export type { Control, FieldPath, FieldValues } from 'react-hook-form';
