import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { useCustomerDispatch } from '@components/frontStore/customer/CustomerContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import React from 'react';

const SubmitButton: React.FC<{ formId: string }> = ({ formId }) => {
  const {
    formState: { isSubmitting }
  } = useFormContext();
  return (
    <div className="form-submit-button flex border-t border-divider mt-4 pt-4 justify-between">
      <Button
        title={_('Sign In')}
        onAction={() => {
          (document.getElementById(formId) as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true })
          );
        }}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export const CustomerLoginForm: React.FC<{
  title?: string;
  subtitle?: string;
  redirectUrl: string;
  onError?: (error: any) => void;
  className?: string;
}> = ({ title, subtitle, redirectUrl, onError, className }) => {
  const { login } = useCustomerDispatch();
  return (
    <div className={`login__form ${className}`}>
      <div className="login__form__inner w-full">
        <Area id="customerLoginFormTitleBefore" noOuter />
        {title && (
          <h1 className="login__form__title text-2xl text-center mb-6">
            {_(title)}
          </h1>
        )}
        {subtitle && (
          <p className="login__form__subtitle text-center mb-6">
            {_(subtitle)}
          </p>
        )}
        <Area id="customerLoginFormTitleAfter" noOuter />
        <Area id="customerLoginFormBefore" noOuter />
        <Form
          id="loginForm"
          method="POST"
          onSubmit={async (data) => {
            try {
              await login(data.email, data.password, redirectUrl);
            } catch (error) {
              onError?.(error);
            }
          }}
          onError={onError}
          submitBtn={false}
        >
          <Area
            id="customerLoginForm"
            coreComponents={[
              {
                component: {
                  default: (
                    <InputField
                      prefixIcon={<EnvelopeIcon className="h-5 w-5" />}
                      label={_('Email')}
                      name="email"
                      placeholder={_('Email')}
                      required
                      validation={{
                        required: _('Email is required')
                      }}
                    />
                  )
                },
                sortOrder: 10
              },
              {
                component: {
                  default: (
                    <PasswordField
                      prefixIcon={<LockClosedIcon className="h-5 w-5" />}
                      label={_('Password')}
                      name="password"
                      placeholder={_('Password')}
                      required
                      validation={{
                        required: _('Password is required')
                      }}
                      showToggle
                    />
                  )
                },
                sortOrder: 20
              },
              {
                component: {
                  default: <SubmitButton formId="loginForm" />
                },
                sortOrder: 30
              }
            ]}
          />
        </Form>
        <Area id="customerLoginFormAfter" noOuter />
      </div>
    </div>
  );
};
