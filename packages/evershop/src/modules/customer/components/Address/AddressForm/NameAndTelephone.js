import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '../../../../../lib/components/form/Field';

export function NameAndTelephone({ address }) {
  return (
    <div className="grid grid-cols-2 gap-1">
      <div>
        <Field
          type="text"
          name="address[full_name]"
          value={address?.fullName}
          label="Full name"
          placeholder="Full Name"
          validationRules={[{
            rule: 'notEmpty',
            message: 'Full name is required'
          }]}
        />
      </div>
      <div>
        <Field
          type="text"
          name="address[telephone]"
          value={address?.telephone}
          label="Telephone"
          placeholder="Telephone"
          validationRules={[{
            rule: 'notEmpty',
            message: 'Telephone is required'
          }]}
        />
      </div>
    </div>
  );
}

NameAndTelephone.propTypes = {
  address: PropTypes.shape({
    fullName: PropTypes.string,
    telephone: PropTypes.string
  })
};
