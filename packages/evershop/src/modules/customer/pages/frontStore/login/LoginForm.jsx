import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import './LoginForm.scss';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import Button from '@components/common/form/Button';

export default function LoginForm({
  action,
  homeUrl,
  registerUrl,
  forgotPasswordUrl
}) {
  const [error, setError] = React.useState(null);

  return (
    <div className="flex justify-center items-center">
      <div className="login-form flex justify-center items-center">
        <div className="login-form-inner">
          <h1 className="text-center">{_('Login')}</h1>
          {error && <div className="text-critical mb-1">{error}</div>}
          <Form
            id="loginForm"
            action={action}
            isJSON
            method="POST"
            onSuccess={(response) => {
              if (!response.error) {
                window.location.href = homeUrl;
              } else {
                setError(response.error.message);
              }
            }}
            btnText={_('SIGN IN')}
            submitBtn={false}
          >
            <Field
              name="email"
              type="text"
              placeholder={_('Email')}
              validationRules={['notEmpty', 'email']}
            />
            <Field
              name="password"
              type="password"
              placeholder={_('Password')}
              validationRules={['notEmpty']}
            />
            <div className="form-submit-button flex border-t border-divider mt-1 pt-1">
              <Button
                title="SIGN IN"
                type="submit"
                onAction={() => {
                  document
                    .getElementById('loginForm')
                    .dispatchEvent(
                      new Event('submit', { cancelable: true, bubbles: true })
                    );
                }}
              />
            </div>
          </Form>
          <div className="text-center mt-1 gap-2 flex justify-center">
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

LoginForm.propTypes = {
  action: PropTypes.string.isRequired,
  homeUrl: PropTypes.string.isRequired,
  registerUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    homeUrl: url(routeId: "homepage")
    action: url(routeId: "createCustomerSession")
    registerUrl: url(routeId: "register")
    forgotPasswordUrl: url(routeId: "resetPasswordPage")
  }
`;
