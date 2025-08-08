import React from 'react';
import './ResetPasswordForm.scss';
import Button from '@components/common/Button.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { _ } from '../../../../../lib/locale/translate/_.js';

function Success() {
  return (
    <div className="flex justify-center items-center">
      <div className="reset-password-form flex justify-center items-center">
        <div className="reset-password-form-inner">
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

const ResetForm: React.FC<{ action: string; onSuccess: () => void }> = ({
  action,
  onSuccess
}) => {
  const [error, setError] = React.useState(null);
  const {
    formState: { isSubmitting: loading }
  } = useFormContext();
  return (
    <div className="flex justify-center items-center">
      <div className="reset-password-form flex justify-center items-center">
        <div className="reset-password-form-inner">
          <h1 className="text-center">{_('Enter your email address')}</h1>
          {error && <div className="text-critical mb-2">{error}</div>}
          <Form
            id="resetPasswordForm"
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
            <EmailField
              name="email"
              placeholder={_('Email')}
              required
              validation={{
                required: _('Email is required')
              }}
            />
            <div className="form-submit-button flex border-t border-divider mt-2 pt-2">
              <Button
                title={_('RESET PASSWORD')}
                type="submit"
                onAction={() => {
                  (
                    document.getElementById(
                      'resetPasswordForm'
                    ) as HTMLFormElement
                  ).dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
                }}
                isLoading={loading}
              />
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

interface ResetPasswordFormProps {
  action: string;
}

export default function ResetPasswordForm({ action }: ResetPasswordFormProps) {
  const [success, setSuccess] = React.useState(false);

  return success ? (
    <Success />
  ) : (
    <ResetForm
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
