import Button from '@components/common/Button.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form } from '@components/common/form/Form.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useForm } from 'react-hook-form';

export const ResetPasswordForm: React.FC<{
  title: string;
  subtitle: string;
  action: string;
  className: string;
  onSuccess: () => void;
}> = ({ title, subtitle, action, className, onSuccess }) => {
  const [error, setError] = React.useState(null);
  const form = useForm();
  const {
    formState: { isSubmitting: loading }
  } = form;

  return (
    <div className="flex justify-center items-center">
      <div className={`reset__password__form ${className}`}>
        <div className="reset__password__form__inner">
          {title && (
            <h1 className="reset__password__form__title text-2xl text-center mb-6">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="reset__password__form__subtitle text-center mb-6">
              {subtitle}
            </p>
          )}
          {error && <div className="text-critical mb-2">{error}</div>}
          <Form
            id="resetPasswordForm"
            form={form}
            action={action}
            method="POST"
            onSuccess={(response) => {
              if (!response.error) {
                onSuccess();
              } else {
                setError(response.error.message);
              }
            }}
            submitBtn={false}
          >
            <EmailField
              prefixIcon={<EnvelopeIcon className="h-5 w-5" />}
              name="email"
              label={_('Email')}
              placeholder={_('Email')}
              required
              validation={{
                required: _('Email is required')
              }}
            />
            <div className="reset__password__form__submit__button flex border-t border-divider mt-2 pt-2">
              <Button
                title={_('Reset Password')}
                type="submit"
                onAction={() => {
                  (
                    document.getElementById(
                      'resetPasswordForm'
                    ) as HTMLFormElement
                  ).dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
                }}
                isLoading={loading}
              />
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};
