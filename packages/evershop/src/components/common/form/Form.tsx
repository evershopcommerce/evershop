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
  action: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  formOptions?: UseFormProps<T>;
  onSubmit?: SubmitHandler<T>;
  onSuccess?: (response: any, data: T) => void;
  onError?: (error: any, data: T) => void;
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
  successMessage = 'Saved successfully!',
  errorMessage = 'Something went wrong! Please try again.',
  submitBtn = true,
  submitBtnText = 'Save',
  loading = false,
  children,
  className,
  noValidate = true,
  ...props
}: FormProps<T>) {
  const methods =
    externalForm ||
    useForm<T>({
      shouldUnregister: true,
      ...formOptions
    });
  const {
    handleSubmit,
    formState: { isSubmitting }
  } = methods;

  const defaultSubmit: SubmitHandler<T> = async (data) => {
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
        onError(error, data);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleFormSubmit = onSubmit || defaultSubmit;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={className}
        noValidate={noValidate}
        {...props}
      >
        <fieldset disabled={loading}>{children}</fieldset>

        {submitBtn && (
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className={
                !isSubmitting && !loading
                  ? 'button primary'
                  : 'button primary loading'
              }
            >
              {!isSubmitting && !loading ? (
                <span>{submitBtnText}</span>
              ) : (
                <svg
                  style={{
                    background: 'rgb(255, 255, 255, 0)',
                    display: 'block',
                    shapeRendering: 'auto'
                  }}
                  width="1rem"
                  height="1rem"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid"
                >
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    stroke="#5c5f62"
                    strokeWidth="10"
                    r="43"
                    strokeDasharray="202.63272615654165 69.54424205218055"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      repeatCount="indefinite"
                      dur="1s"
                      values="0 50 50;360 50 50"
                      keyTimes="0;1"
                    />
                  </circle>
                </svg>
              )}
            </button>
          </div>
        )}
      </form>
    </FormProvider>
  );
}

export { useFormContext } from 'react-hook-form';
export { Controller } from 'react-hook-form';
export type { Control, FieldPath, FieldValues } from 'react-hook-form';
