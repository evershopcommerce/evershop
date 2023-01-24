import React from 'react';
import PropTypes from 'prop-types';
import { Province } from './Province';
import { Field } from '../../../../../lib/components/form/Field';

export function ProvinceAndPostcode({
  address, allowCountries, selectedCountry
}) {
  return (
    <div className="grid grid-cols-2 gap-1 mt-1">
      <div>
        <Province
          allowCountries={allowCountries}
          selectedCountry={selectedCountry}
          selectedProvince={address?.province?.code}
          fieldName="address[province]"
        />
      </div>
      <div>
        <Field
          type="text"
          name="address[postcode]"
          value={address?.postcode}
          label="Postcode"
          placeholder="Postcode"
          validationRules={[{
            rule: 'notEmpty',
            message: 'Postcode is required'
          }]}
        />
      </div>
    </div>
  );
}

ProvinceAndPostcode.propTypes = {
  address: PropTypes.shape({
    province: PropTypes.shape({
      code: PropTypes.string
    }),
    postcode: PropTypes.string
  }),
  allowCountries: PropTypes.arrayOf(PropTypes.shape({
    code: PropTypes.string,
    name: PropTypes.string,
    provinces: PropTypes.arrayOf(PropTypes.shape({
      code: PropTypes.string,
      name: PropTypes.string
    }))
  })).isRequired,
  selectedCountry: PropTypes.string
};
