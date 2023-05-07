import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '@components/common/form/Field';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export function NameAndTelephone({ address }) {
  return (
    <div className="grid grid-cols-2 gap-1">
      <div>
        <Field
          type="text"
          name="address[full_name]"
          value={address?.fullName}
          label={_('Full name')}
          placeholder={_('Full name')}
          validationRules={[
            {
              rule: 'notEmpty',
              message: _('Full name is required')
            }
          ]}
        />
      </div>
      <div>
        <Field
          type="text"
          name="address[telephone]"
          value={address?.telephone}
          label={_('Telephone')}
          placeholder={_('Telephone')}
          validationRules={[
            {
              rule: 'notEmpty',
              message: _('Telephone is required')
            }
          ]}
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

NameAndTelephone.defaultProps = {
  address: {}
};
