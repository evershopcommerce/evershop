import { Field } from '@components/common/form/Field';
import PropTypes from 'prop-types';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

export function Province({
  selectedCountry,
  selectedProvince,
  allowCountries,
  fieldName = 'province'
}) {
  const provinces = selectedCountry
    ? allowCountries.find((c) => c.code === selectedCountry).provinces
    : [];

  if (!provinces.length) {
    return null;
  }
  return (
    <div>
      <Field
        type="select"
        value={provinces.find((p) => p.code === selectedProvince)?.code}
        name={fieldName}
        label={_('Province')}
        placeholder={_('Province')}
        validationRules={[
          {
            rule: 'notEmpty',
            message: _('Province is required')
          }
        ]}
        options={provinces.map((p) => ({ value: p.code, text: p.name }))}
      />
    </div>
  );
}

Province.propTypes = {
  selectedProvince: PropTypes.string,
  selectedCountry: PropTypes.string,
  allowCountries: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string,
      name: PropTypes.string,
      provinces: PropTypes.arrayOf(
        PropTypes.shape({
          code: PropTypes.string,
          name: PropTypes.string
        })
      )
    })
  ).isRequired,
  fieldName: PropTypes.string
};

Province.defaultProps = {
  selectedProvince: '',
  selectedCountry: '',
  fieldName: 'province'
};
