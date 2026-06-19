import { Card, CardContent } from '@components/common/ui/Card.js';
import { CustomerLoginForm } from '@components/frontStore/customer/LoginForm.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { toast } from 'react-toastify';

interface LoginPageProps {
  homeUrl: string;
  registerUrl: string;
  forgotPasswordUrl: string;
}

export default function LoginPage({
  homeUrl,
  registerUrl,
  forgotPasswordUrl
}: LoginPageProps) {
  return (
    <div className="login__page flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent>
            <CustomerLoginForm
              title={_('Welcome Back!')}
              subtitle={_('Please sign in to your account')}
              redirectUrl={homeUrl}
              onError={(error) => {
                toast.error(error.message);
              }}
              className="w-full"
            />
          </CardContent>
        </Card>
        <div className="login__page__options text-center mt-4 gap-5 flex justify-center">
          <a className="text-interactive hover:underline" href={registerUrl}>
            {_('Create an account')}
          </a>
          <a
            className="text-destructive hover:underline"
            href={forgotPasswordUrl}
          >
            {_('Forgot your password?')}
          </a>
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
    registerUrl: url(routeId: "register")
    forgotPasswordUrl: url(routeId: "resetPasswordPage")
  }
`;
