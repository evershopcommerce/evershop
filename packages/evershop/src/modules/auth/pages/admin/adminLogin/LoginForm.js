import React from 'react';
import { Field } from '../../../../../lib/components/form/Field';
import { Form } from '../../../../../lib/components/form/Form';
import './LoginForm.scss';
import UserCircleIcon from '@heroicons/react/solid/esm/UserCircleIcon';

export default function LoginForm({ authUrl, dashboardUrl }) {
  const [error, setError] = React.useState(null);

  const onSuccess = (response) => {
    if (response.success) {
      window.location.href = dashboardUrl;
    } else {
      setError(response.message);
    }
  }
  return <div className='admin-login-form'>
    <div className='flex items-center justify-center mb-2'>
      <UserCircleIcon width={60} height={60} fill="var(--primary)" />
    </div>
    {error && <div className="text-critical py-1">{error}</div>}
    <Form
      action={authUrl}
      method="POST"
      id="adminLoginForm"
      isJSON={true}
      onSuccess={onSuccess}
      btnText="Login"
    >
      <Field
        name="email"
        type="email"
        label="Email"
        placeholder="Email"
        validationRules={['notEmpty', 'email']}
      />
      <Field
        name="password"
        type="password"
        label="Password"
        placeholder="Password"
        validationRules={['notEmpty']}
      />
    </Form>
  </div>
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
}

export const query = `
  query Query {
    authUrl: url(routeId: "adminAuth")
    dashboardUrl: url(routeId: "dashboard")
  }
`