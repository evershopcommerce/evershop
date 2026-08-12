import { Card, CardContent } from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { CustomerRegistrationForm } from '@components/frontStore/customer/RegistrationForm.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface RegisterPageProps {
  homeUrl: string;
  loginUrl: string;
}
export default function RegisterPage({ homeUrl, loginUrl }: RegisterPageProps) {
  return (
    <div className="register__form flex flex-col items-center py-10 md:px-4">
      <div className="w-full max-w-md">
        <Card className="rounded-lg border border-border py-8 shadow-none ring-0">
          <CardContent className="px-8">
            <CustomerRegistrationForm
              title={_('Create account')}
              subtitle={_('Join us for exclusive offers and order tracking')}
              redirectUrl={homeUrl}
              onError={(error) => {
                toast.error(error);
              }}
              className="w-full"
            />
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {_('Already have an account?')}{' '}
          <a
            className="font-medium text-foreground hover:underline"
            href={loginUrl}
          >
            {_('Sign in')}
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
    loginUrl: url(routeId: "login")
  }
`;
