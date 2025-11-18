import { EmailField } from '@components/common/form/EmailField.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { Area } from '@components/common/index.js';
import { useCustomerDispatch } from '@components/frontStore/customer/CustomerContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  EnvelopeIcon,
  LockClosedIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import React from 'react';

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
                  password: data.password
                },
                true,
                redirectUrl
              );
            } catch (error) {
              onError?.(error.message);
            }
          }}
          submitBtnText={_('Sign Up')}
        >
          <Area
            id="customerRegisterForm"
            coreComponents={[
              {
                component: {
                  default: (
                    <InputField
                      prefixIcon={<UserCircleIcon className="h-5 w-5" />}
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
                      prefixIcon={<EnvelopeIcon className="h-5 w-5" />}
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
                      prefixIcon={<LockClosedIcon className="h-5 w-5" />}
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
              }
            ]}
          />
        </Form>
        <Area id="customerRegisterFormAfter" noOuter />
      </div>
    </div>
  );
};
