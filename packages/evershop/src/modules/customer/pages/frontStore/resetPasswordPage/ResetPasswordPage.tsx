import { ResetPasswordForm } from '@components/frontStore/customer/ResetPasswordForm.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

function Success() {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="reset__password__success flex justify-center items-center pt-10 md:pt-36">
        <div className="reset__password__success__inner max-w-md px-4">
          <p className="text-center text-success">
            {_(
              'We have sent you an email with a link to reset your password. Please check your inbox.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ResetPasswordFormProps {
  action: string;
}

export default function ResetPasswordPage({ action }: ResetPasswordFormProps) {
  const [success, setSuccess] = React.useState(false);

  return success ? (
    <Success />
  ) : (
    <ResetPasswordForm
      title={_('Reset Your Password')}
      subtitle={_('Please enter your email to receive a reset link')}
      className="w-[30rem] max-w-max md:max-w-[80%] bg-white rounded-3xl p-6 shadow-lg border border-divider"
      action={action}
      onSuccess={() => {
        setSuccess(true);
      }}
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "resetPassword")
  }
`;
