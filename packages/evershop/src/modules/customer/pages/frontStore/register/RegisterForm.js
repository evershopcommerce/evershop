import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Form } from '../../../../../lib/components/form/Form';
import './RegisterForm.scss';

export default function RegisterForm({
  action, homeUrl, loginApi, loginUrl
}) {
  const [error, setError] = React.useState(null);
  const [email, setEmail] = React.useState(null);
  const [password, setPassword] = React.useState(null);

  return (
    <div className="register-form flex justify-center items-center">
      <div className="register-form-inner">
        <h1 className="text-center">Create A New Account</h1>
        {error && <div className="text-critical mb-1">{error}</div>}
        <Form
          id="loginForm"
          action={action}
          isJSON
          method="POST"
          onSuccess={async (response) => {
            if (!response.error) {
              // Log the customer in
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
          btnText="SIGN UP"
        >
          <Field
            name="full_name"
            type="text"
            placeholder="Full Name"
            validationRules={['notEmpty']}
          />
          <Field
            name="email"
            type="text"
            placeholder="Email"
            validationRules={['notEmpty', 'email']}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
          <Field
            name="password"
            type="password"
            placeholder="Password"
            validationRules={['notEmpty']}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </Form>
        <div className="text-center mt-1">
          <span>
            Already have an account?
            <a className="text-interactive" href={loginUrl}> Login </a>
          </span>
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
    loginApi: url(routeId: "createCustomerSession")
    loginUrl: url(routeId: "login")
  }
`;
