import Area from '@components/common/Area.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { useCustomerDispatch } from '@components/frontStore/customer/customerContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';

interface RegisterFormProps {
  homeUrl: string;
  loginUrl: string;
}
export default function RegisterForm({ homeUrl, loginUrl }: RegisterFormProps) {
  const { register } = useCustomerDispatch();
  const [error, setError] = React.useState(null);
  const form = useForm();

  return (
    <div className="flex justify-center items-center">
      <div className="register__form flex justify-center items-center w-[30rem] max-w-[80%] bg-white rounded-3xl px-5 py-16 shadow-lg border border-divider">
        <div className="register__form__inner">
          <h1 className="text-center mb-6">{_('Create A New Account')}</h1>
          {error && <div className="text-critical mb-2">{error}</div>}
          <Form
            id="registerForm"
            form={form}
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
                  homeUrl
                );
              } catch (error) {
                setError(error.message);
              }
            }}
            submitBtnText={_('SIGN UP')}
          >
            <Area
              id="customerRegisterForm"
              coreComponents={[
                {
                  component: {
                    default: (
                      <InputField
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
                        name="password"
                        label={_('Password')}
                        placeholder={_('Password')}
                        required
                        validation={{ required: _('Password is required') }}
                      />
                    )
                  },
                  sortOrder: 30
                }
              ]}
            />
          </Form>
          <div className="text-center mt-2">
            <span>
              {_('Already have an account?')}
              <a className="text-interactive" href={loginUrl}>
                {' '}
                {_('Login')}{' '}
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    homeUrl: url(routeId: "homepage")
    loginUrl: url(routeId: "login")
  }
`;
