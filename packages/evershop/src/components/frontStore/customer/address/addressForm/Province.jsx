import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '@components/common/form/Field';
import { _ } from '@evershop/evershop/src/lib/locale/translate';

export function Province({
  selectedCountry,
  selectedProvince,
  allowCountries,
  fieldName = 'province'
}) {
  const provinces = selectedCountry
    ? allowCountries.find((c) => c.code === selectedCountry).provinces
    : [];
  return (
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
