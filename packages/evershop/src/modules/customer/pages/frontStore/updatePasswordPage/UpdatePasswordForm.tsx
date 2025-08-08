import React from 'react';
import './UpdatePasswordForm.scss';
import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { PasswordField } from '@components/common/form/PasswordField.js';
import { useForm } from 'react-hook-form';
import { _ } from '../../../../../lib/locale/translate/_.js';

function Success() {
  return (
    <div className="flex justify-center items-center">
      <div className="update-password-form flex justify-center items-center">
        <div className="update-password-form-inner">
          <p className="text-center text-success">
            {_(
              'Your password has been updated. You can now login with your new password.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

const UpdateForm: React.FC<{ action: string; onSuccess: () => void }> = ({
  action,
  onSuccess
}) => {
  const [error, setError] = React.useState(null);
  const [token, setToken] = React.useState<string | undefined>('');
  const form = useForm();

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token') as string;
    setToken(tokenParam);
  }, []);

  return (
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
                onSuccess();
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
                onAction={() => {
                  (
                    document.getElementById(
                      'updatePasswordForm'
                    ) as HTMLFormElement
                  ).dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
                }}
                isLoading={form.formState.isSubmitting}
              />
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

interface UpdatePasswordFormProps {
  action: string;
}

export default function UpdatePasswordForm({
  action
}: UpdatePasswordFormProps) {
  const [success, setSuccess] = React.useState(false);

  return success ? (
    <Success />
  ) : (
    <UpdateForm
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
    action: url(routeId: "updatePassword")
  }
`;
