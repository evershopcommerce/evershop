import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '@components/common/form/Field';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export function Country({
  allowCountries,
  selectedCountry,
  setSelectedCountry,
  fieldName = 'country'
}) {
  const onChange = (e) => {
    setSelectedCountry(e.target.value);
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <Field
        type="select"
        value={selectedCountry || ''}
        label={_('Country')}
        name={fieldName}
        placeholder={_('Country')}
        onChange={onChange}
        validationRules={[
          {
            rule: 'notEmpty',
            message: _('Country is required')
          }
        ]}
        options={allowCountries.map((c) => ({ value: c.code, text: c.name }))}
      />
    </div>
  );
}

Country.propTypes = {
  allowCountries: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string,
      name: PropTypes.string
    })
  ).isRequired,
  selectedCountry: PropTypes.string,
  setSelectedCountry: PropTypes.func.isRequired,
  fieldName: PropTypes.string
};

Country.defaultProps = {
  fieldName: 'country',
  selectedCountry: null
};
