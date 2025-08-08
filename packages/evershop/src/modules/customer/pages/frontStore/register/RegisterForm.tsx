import React from 'react';
import './RegisterForm.scss';
import Area from '@components/common/Area.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { useForm } from 'react-hook-form';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface RegisterFormProps {
  action: string;
  homeUrl: string;
  loginApi: string;
  loginUrl: string;
}
export default function RegisterForm({
  action,
  homeUrl,
  loginApi,
  loginUrl
}: RegisterFormProps) {
  const [error, setError] = React.useState(null);
  const form = useForm();
  const { watch } = form;
  const email = watch('email');
  const password = watch('password');

  return (
    <div className="flex justify-center items-center">
      <div className="register-form flex justify-center items-center">
        <div className="register-form-inner">
          <h1 className="text-center">{_('Create A New Account')}</h1>
          {error && <div className="text-critical mb-2">{error}</div>}
          <Form
            id="registerForm"
            action={action}
            form={form}
            method="POST"
            onSuccess={async (response) => {
              if (!response.error) {
                const loginResponse = await fetch(loginApi, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    email,
                    password
                  })
                });

                const loginResponseJson = await loginResponse.json();
                if (loginResponseJson.error) {
                  setError(loginResponseJson.error.message);
                } else {
                  window.location.href = homeUrl;
                }
              } else {
                setError(response.error.message);
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
    action: url(routeId: "createCustomer")
    loginApi: url(routeId: "customerLoginJson")
    loginUrl: url(routeId: "login")
  }
`;
