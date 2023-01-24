import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '../../../../../lib/components/form/Field';

export function Province({
  selectedCountry,
  selectedProvince,
  allowCountries,
  fieldName = 'province'
}) {
  const provinces = selectedCountry ? allowCountries.find((c) => c.code === selectedCountry).provinces : [];
  return (
    <Field
      type="select"
      value={provinces.find((p) => p.code === selectedProvince)?.code}
      name={fieldName}
      label="Province"
      placeholder="Province"
      validationRules={[{
        rule: 'notEmpty',
        message: 'Province is required'
      }]}
      options={
        provinces.map((p) => ({ value: p.code, text: p.name }))
      }
    />
  );
}

Province.propTypes = {
  formId: PropTypes.string.isRequired,
  selectedProvince: PropTypes.string,
  selectedCountry: PropTypes.string,
  allowCountries: PropTypes.arrayOf(PropTypes.shape({
    code: PropTypes.string,
    name: PropTypes.string,
    provinces: PropTypes.arrayOf(PropTypes.shape({
      code: PropTypes.string,
      name: PropTypes.string
    }))
  })).isRequired
};
