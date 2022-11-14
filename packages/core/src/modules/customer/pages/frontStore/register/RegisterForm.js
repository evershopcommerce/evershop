import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Form } from '../../../../../lib/components/form/Form';
import './RegisterForm.scss';

export default function LoginForm({ action, homeUrl, loginUrl }) {
  const [error, setError] = React.useState(null);

  return <div className='register-form flex justify-center items-center'>
    <div className='register-form-inner'>
      <h1 className='text-center'>Create A New Account</h1>
      {error && <div className='text-critical mb-1'>{error}</div>}
      <Form
        id='loginForm'
        action={action}
        isJSON={true}
        method='POST'
        onSuccess={(response) => {
          if (response.success) {
            window.location.href = homeUrl;
          } else {
            setError(response.message);
          }
        }}
        btnText='SIGN UP'
      >
        <Field
          name='full_name'
          type='text'
          placeholder='Full Name'
          validationRules={['notEmpty']}
        />
        <Field
          name='email'
          type='text'
          placeholder='Email'
          validationRules={['notEmpty', 'email']}
        />
        <Field
          name='password'
          type='password'
          placeholder='Password'
          validationRules={['notEmpty']}
        />
      </Form>
      <div className='text-center mt-1'>
        <span>Already have an account? <a className='text-interactive' href={loginUrl}> Login </a></span>
      </div>
    </div>
  </div>
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    homeUrl: url(routeId: "homepage")
    action: url(routeId: "registerPost")
    loginUrl: url(routeId: "login")
  }
`