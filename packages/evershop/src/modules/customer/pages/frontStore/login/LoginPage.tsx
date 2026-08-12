import { Card, CardContent } from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { CustomerLoginForm } from '@components/frontStore/customer/LoginForm.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

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
  // Return the shopper to `?redirect=` after login (e.g. back to checkout when guest
  // checkout is disabled). Only same-site relative paths are honoured (no open redirects).
  const [redirectUrl, setRedirectUrl] = React.useState(homeUrl);
  React.useEffect(() => {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      setRedirectUrl(redirect);
    }
  }, []);
  return (
    <div className="login__page flex flex-col items-center py-10 md:px-4">
      <div className="w-full max-w-md">
        <Card className="rounded-lg border border-border py-8 shadow-none ring-0">
          <CardContent className="px-8">
            <CustomerLoginForm
              title={_('Sign in')}
              subtitle={_('Welcome back — sign in to your account.')}
              redirectUrl={redirectUrl}
              onError={(error) => {
                toast.error(error.message);
              }}
              className="w-full"
            />
          </CardContent>
        </Card>
        <div className="login__page__options mt-6 flex flex-col items-center gap-2 text-sm">
          <a
            className="text-muted-foreground hover:text-foreground hover:underline"
            href={forgotPasswordUrl}
          >
            {_('Forgot your password?')}
          </a>
          <div className="text-muted-foreground">
            {_('New here?')}{' '}
            <a
              className="font-medium text-foreground hover:underline"
              href={registerUrl}
            >
              {_('Create an account')}
            </a>
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
    registerUrl: url(routeId: "register")
    forgotPasswordUrl: url(routeId: "resetPasswordPage")
  }
`;
