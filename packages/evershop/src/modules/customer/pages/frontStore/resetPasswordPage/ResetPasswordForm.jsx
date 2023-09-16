import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import './ResetPasswordForm.scss';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import Button from '@components/common/form/Button';

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

function ResetForm({ action, onSuccess }) {
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="flex justify-center items-center">
      <div className="reset-password-form flex justify-center items-center">
        <div className="reset-password-form-inner">
          <h1 className="text-center">{_('Enter your email address')}</h1>
          {error && <div className="text-critical mb-1">{error}</div>}
          <Form
            id="resetPasswordForm"
            action={action}
            isJSON
            method="POST"
            onStart={() => {
              setLoading(true);
            }}
            onSuccess={(response) => {
              if (!response.error) {
                onSuccess();
              } else {
                setError(response.error.message);
              }
            }}
            onComplete={() => {
              setLoading(false);
            }}
            submitBtn={false}
          >
            <Field
              name="email"
              type="text"
              placeholder={_('Email')}
              validationRules={['notEmpty', 'email']}
            />
            <div className="form-submit-button flex border-t border-divider mt-1 pt-1">
              <Button
                title={_('RESET PASSWORD')}
                type="submit"
                onAction={() => {
                  document
                    .getElementById('resetPasswordForm')
                    .dispatchEvent(
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
}

ResetForm.propTypes = {
  action: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired
};

export default function ResetPasswordForm({ action }) {
  const [success, setSuccess] = React.useState(null);

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

ResetPasswordForm.propTypes = {
  action: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "resetPassword")
  }
`;
