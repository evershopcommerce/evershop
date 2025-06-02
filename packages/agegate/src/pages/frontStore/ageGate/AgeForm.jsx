import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

function AgeForm({ action, homeUrl, failurePageUrl, setting: { minAge } }) {
  return (
    <div className="page-width p-2">
      <Form
        id="ageForm"
        action={action}
        method="POST"
        onSuccess={(response) => {
          if (!response.error) {
            if (response.data.passed) {
              window.location.href = homeUrl;
            } else {
              // Redirect to age verification failure page
              window.location.href = failurePageUrl;
            }
          } else {
            toast.error('Something wront. Please try again later');
          }
        }}
        btnText="Submit"
      >
        <div className="text-center">
          <h3>Age Verification</h3>
          <p>
            We only allow users who are {minAge} years and above. Please enter
            your age to proceed.
          </p>
        </div>
        <br />
        <div className="form-group">
          <Field
            type="text"
            name="age"
            value={1}
            validationRules={['notEmpty']}
          />
        </div>
      </Form>
    </div>
  );
}

AgeForm.propTypes = {
  action: PropTypes.string.isRequired,
  homeUrl: PropTypes.string.isRequired,
  failurePageUrl: PropTypes.string.isRequired,
  setting: PropTypes.shape({
    minAge: PropTypes.number.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 1
};

export const query = `
  query Query {
    action: url(routeId: "verifyAge"),
    homeUrl: url(routeId: "homepage"),
    failurePageUrl: url(routeId: "ageVerifyFailure"),
    setting {
      minAge
    }
  }
`;

export default AgeForm;
