import React from 'react';
import './LoginForm.scss';
import Area from '@components/common/Area.js';
import Button from '@components/common/Button.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { _ } from '../../../../../lib/locale/translate/_.js';

const SubmitButton: React.FC<{ formId: string }> = ({ formId }) => {
  const {
    formState: { isSubmitting }
  } = useFormContext();
  return (
    <div className="form-submit-button flex border-t border-divider mt-4 pt-4 justify-between">
      <Button
        title="SIGN IN"
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

interface LoginFormProps {
  action: string;
  homeUrl: string;
  registerUrl: string;
  forgotPasswordUrl: string;
}

export default function LoginForm({
  action,
  homeUrl,
  registerUrl,
  forgotPasswordUrl
}: LoginFormProps) {
  const [error, setError] = React.useState(null);

  return (
    <div className="flex justify-center items-center">
      <div className="login-form flex justify-center items-center">
        <div className="login-form-inner">
          <h1 className="text-center">{_('Login')}</h1>
          {error && <div className="text-critical mb-2">{error}</div>}
          <Form
            id="loginForm"
            action={action}
            method="POST"
            onSuccess={(response) => {
              if (!response.error) {
                window.location.href = homeUrl;
              } else {
                setError(response.error.message);
              }
            }}
            submitBtn={false}
          >
            <Area
              id="loginFormInner"
              coreComponents={[
                {
                  component: {
                    default: (
                      <EmailField
                        label="Email"
                        name="email"
                        placeholder="Email"
                        required
                        validation={{
                          required: 'Email is required'
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
                        label="Password"
                        name="password"
                        placeholder="Password"
                        required
                        validation={{
                          required: 'Password is required'
                        }}
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
          <div className="text-center mt-2 gap-5 flex justify-center">
            <a className="text-interactive" href={registerUrl}>
              {_('Create an account')}
            </a>
            <a href={forgotPasswordUrl}>{_('Forgot your password?')}</a>
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
    action: url(routeId: "customerLoginJson")
    registerUrl: url(routeId: "register")
    forgotPasswordUrl: url(routeId: "resetPasswordPage")
  }
`;
