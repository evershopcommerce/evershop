import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Form } from '../../../../../lib/components/form/Form';
import './LoginForm.scss';

export default function LoginForm({ action, homeUrl, registerUrl }) {
  const [error, setError] = React.useState(null);

  return (
    <div className="login-form flex justify-center items-center">
      <div className="login-form-inner">
        <h1 className="text-center">Login</h1>
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
          btnText="SIGN IN"
        >
          <Field
            name="email"
            type="text"
            placeholder="Email"
            validationRules={['notEmpty', 'email']}
          />
          <Field
            name="password"
            type="password"
            placeholder="Password"
            validationRules={['notEmpty']}
          />
        </Form>
        <div className="text-center mt-1">
          <a className="text-interactive" href={registerUrl}>Create an account</a>
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
    action: url(routeId: "createCustomerSession")
    registerUrl: url(routeId: "register")
  }
`;
