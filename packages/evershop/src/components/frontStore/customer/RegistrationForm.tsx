import { EmailField } from '@components/common/form/EmailField.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { Area } from '@components/common/index.js';
import { Button } from '@components/common/ui/Button.js';
import { useCustomerDispatch } from '@components/frontStore/customer/CustomerContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { LockKeyhole, Mail, User } from 'lucide-react';
import React from 'react';

const SubmitButton: React.FC<{ formId: string }> = ({ formId }) => {
  const {
    formState: { isSubmitting }
  } = useFormContext();
  return (
    <div className="form-submit-button flex border-t border-border mt-4 pt-4 justify-between">
      <Button
        className={'w-full'}
        size={'lg'}
        onClick={() => {
          (document.getElementById(formId) as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true })
          );
        }}
        isLoading={isSubmitting}
      >
        {_(isSubmitting ? 'Signing Up...' : 'Sign Up')}
      </Button>
    </div>
  );
};

export const CustomerRegistrationForm: React.FC<{
  title?: string;
  subtitle?: string;
  className?: string;
  redirectUrl: string;
  onError?: (error: string) => void;
}> = ({ title, subtitle, redirectUrl, onError, className }) => {
  const { register } = useCustomerDispatch();
  return (
    <div className={`register__form ${className}`}>
      <div className="register__form__inner w-full">
        <Area id="customerRegisterFormTitleBefore" noOuter />
        {title && (
          <h1 className="register__form__title text-2xl text-center mb-6">
            {_(title)}
          </h1>
        )}
        <Area id="customerRegisterFormTitleAfter" noOuter />
        {subtitle && (
          <p className="register__form__subtitle text-center mb-6">
            {_(subtitle)}
          </p>
        )}
        <Area id="customerRegisterFormBefore" noOuter />
        <Form
          id="registerForm"
          method="POST"
          onSubmit={async (data) => {
            try {
              await register(
                {
                  full_name: data.full_name,
                  email: data.email,
                  password: data.password,
                  ...data
                },
                true,
                redirectUrl
              );
            } catch (error) {
              onError?.(error.message);
            }
          }}
          submitBtn={false}
        >
          <Area
            id="customerRegisterForm"
            className="space-y-3"
            coreComponents={[
              {
                component: {
                  default: (
                    <InputField
                      prefixIcon={<User className="h-5 w-5" />}
                      name="full_name"
                      label={_('Full Name')}
                      placeholder={_('Full Name')}
                      required
                      validation={{ required: _('Full Name is required') }}
                    />
                  )
                },
                sortOrder: 10
              },
              {
                component: {
                  default: (
                    <EmailField
                      prefixIcon={<Mail className="h-5 w-5" />}
                      name="email"
                      label={_('Email')}
                      placeholder={_('Email')}
                      required
                      validation={{ required: _('Email is required') }}
                    />
                  )
                },
                sortOrder: 20
              },
              {
                component: {
                  default: (
                    <PasswordField
                      prefixIcon={<LockKeyhole className="h-5 w-5" />}
                      name="password"
                      label={_('Password')}
                      placeholder={_('Password')}
                      required
                      showToggle
                      validation={{ required: _('Password is required') }}
                    />
                  )
                },
                sortOrder: 30
              },
              {
                component: {
                  default: <SubmitButton formId="registerForm" />
                },
                sortOrder: 40
              }
            ]}
          />
        </Form>
        <Area id="customerRegisterFormAfter" noOuter />
      </div>
    </div>
  );
};
