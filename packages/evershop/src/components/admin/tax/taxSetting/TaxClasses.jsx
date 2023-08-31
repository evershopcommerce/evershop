import React from 'react';
import PropTypes from 'prop-types';
import TaxClass from './TaxClass';

export function TaxClasses({ countries, getTaxClasses, classes }) {
  return (
    <>
      {classes.map((taxClass) => (
          <TaxClass
            taxClass={taxClass}
            getTaxClasses={getTaxClasses}
            countries={countries}
          />
        ))}
    </>
  );
}

TaxClasses.propTypes = {
  countries: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      provinces: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired
        })
      )
    })
  ).isRequired,
  classes: PropTypes.arrayOf(
    PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      rates: PropTypes.arrayOf(
        PropTypes.shape({
          uuid: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          isCompound: PropTypes.bool.isRequired,
          country: PropTypes.string.isRequired,
          province: PropTypes.string.isRequired,
          postcode: PropTypes.string.isRequired,
          rate: PropTypes.number.isRequired,
          priority: PropTypes.number.isRequired
        })
      ).isRequired
    })
  ).isRequired,
  getTaxClasses: PropTypes.func.isRequired
};
