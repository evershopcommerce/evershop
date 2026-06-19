import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { Button } from '@components/common/ui/Button.js';
import { ResetPasswordForm } from '@components/frontStore/customer/ResetPasswordForm.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';

function Success({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="reset__password__success flex justify-center items-center pt-10 md:pt-36">
        <div className="reset__password__success__inner max-w-md px-4">
          <p className="text-center text-success">{children}</p>
        </div>
      </div>
    </div>
  );
}

const UpdateForm: React.FC<{
  token: string;
  action: string;
  loginUrl: string;
}> = ({ token, action, loginUrl }) => {
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState(null);
  const form = useForm();

  return success ? (
    <Success>
      <div>{_('Your password has been updated successfully.')}</div>
      <div className="flex items-center">
        <Button
          title={_('Go to Login')}
          type="button"
          onClick={() => {
            window.location.href = loginUrl;
          }}
        >
          {_('Go to Login')}
        </Button>
      </div>
    </Success>
  ) : (
    <div className="flex justify-center items-center">
      <div className="update-password-form flex justify-center items-center">
        <div className="update-password-form-inner">
          <h2 className="text-center mb-5">{_('Enter your new password')}</h2>
          {error && <div className="text-critical mb-2">{error}</div>}
          <Form
            form={form}
            id="updatePasswordForm"
            action={action}
            method="POST"
            onSuccess={(response) => {
              if (!response.error) {
                setSuccess(true);
              } else {
                setError(response.error.message);
              }
            }}
            submitBtn={false}
          >
            <PasswordField
              name="password"
              placeholder={_('Password')}
              required
              validation={{
                required: _('Password is required')
              }}
            />
            <InputField name="token" type="hidden" defaultValue={token} />
            <div className="form-submit-button flex border-t border-divider mt-2 pt-2">
              <Button
                title={_('UPDATE PASSWORD')}
                type="submit"
                onClick={() => {
                  (
                    document.getElementById(
                      'updatePasswordForm'
                    ) as HTMLFormElement
                  ).dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
                }}
                isLoading={form.formState.isSubmitting}
              >
                {_('UPDATE PASSWORD')}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

interface ResetFormProps {
  action: string;
}

function ResetForm({ action }: ResetFormProps) {
  const [success, setSuccess] = React.useState(false);
  const [token, setToken] = React.useState<string | undefined>('');

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token') as string;
    setToken(tokenParam);
  }, []);

  return success ? (
    <Success>
      {_(
        'We have sent you an email with a link to reset your password. Please check your inbox.'
      )}
    </Success>
  ) : (
    <ResetPasswordForm
      title={_('Reset Your Password')}
      subtitle={_('Please enter your email to receive a reset link')}
      className="w-120 max-w-max md:max-w-[80%] bg-white rounded-3xl p-6 shadow-lg border border-divider"
      action={action}
      onSuccess={() => {
        setSuccess(true);
      }}
    />
  );
}

interface ResetPasswordFormProps {
  requestAction: string;
  updateAction: string;
  loginUrl: string;
}
export default function ResetPasswordPage({
  requestAction,
  updateAction,
  loginUrl
}: ResetPasswordFormProps) {
  const [token, setToken] = React.useState<string | undefined>('');

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token') as string;
    setToken(tokenParam);
  }, []);

  return token ? (
    <UpdateForm token={token} action={updateAction} loginUrl={loginUrl} />
  ) : (
    <ResetForm action={requestAction} />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    requestAction: url(routeId: "resetPassword"),
    updateAction: url(routeId: "updatePassword"),
    loginUrl: url(routeId: "login")
  }
`;
