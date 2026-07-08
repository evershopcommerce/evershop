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
        <Card>
          <CardContent>
            <CustomerRegistrationForm
              title={_('Create an account')}
              subtitle={_('Join us for exclusive offers and order tracking')}
              redirectUrl={homeUrl}
              onError={(error) => {
                toast.error(error);
              }}
              className="w-full"
            />
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <span>
            {_('Already have an account?')}
            <a className="text-primary hover:underline" href={loginUrl}>
              {' '}
              {_('Login')}{' '}
            </a>
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
    loginUrl: url(routeId: "login")
  }
`;
