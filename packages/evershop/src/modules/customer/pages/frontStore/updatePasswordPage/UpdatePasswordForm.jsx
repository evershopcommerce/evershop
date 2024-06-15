import PropTypes from 'prop-types';
import React from 'react';
import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import './UpdatePasswordForm.scss';
import { _ } from '@evershop/evershop/src/lib/locale/translate';
import Button from '@components/common/form/Button';

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

function UpdateForm({ action, onSuccess }) {
  const [error, setError] = React.useState(null);
  const [token, setToken] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    setToken(tokenParam);
  }, []);

  return (
    <div className="flex justify-center items-center">
      <div className="update-password-form flex justify-center items-center">
        <div className="update-password-form-inner">
          <h2 className="text-center mb-8">{_('Enter your new password')}</h2>
          {error && <div className="text-critical mb-4">{error}</div>}
          <Form
            id="updatePasswordForm"
            action={action}
            isJSON
            method="POST"
            onStart={() => {
              setLoading(true);
            }}
            onComplete={() => {
              setLoading(false);
            }}
            onSuccess={(response) => {
              if (!response.error) {
                onSuccess();
              } else {
                setError(response.error.message);
              }
            }}
            submitBtn={false}
          >
            <Field
              name="password"
              type="password"
              placeholder={_('Password')}
              validationRules={['notEmpty']}
            />
            <Field name="token" type="hidden" value={token} />
            <div className="form-submit-button flex border-t border-divider mt-4 pt-4">
              <Button
                title={_('UPDATE PASSWORD')}
                type="submit"
                onAction={() => {
                  document
                    .getElementById('updatePasswordForm')
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

UpdateForm.propTypes = {
  action: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired
};

export default function UpdatePasswordForm({ action }) {
  const [success, setSuccess] = React.useState(null);

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

UpdatePasswordForm.propTypes = {
  action: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updatePassword")
  }
`;
