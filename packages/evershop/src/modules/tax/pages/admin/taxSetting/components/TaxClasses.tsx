import PropTypes from 'prop-types';
import React from 'react';
import { TaxClass } from './TaxClass.js';

interface TaxClassesProps {
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void>;
  classes: Array<{
    uuid: string;
    name: string;
    rates: Array<{
      uuid: string;
      name: string;
      isCompound: boolean;
      country: string;
      province: string;
      postcode: string;
      rate: number;
      priority: number;
    }>;
    addRateApi: string;
  }>;
}

export function TaxClasses({ getTaxClasses, classes }: TaxClassesProps) {
  return (
    <>
      {classes.map((taxClass) => (
        <TaxClass
          key={taxClass.uuid}
          taxClass={taxClass}
          getTaxClasses={getTaxClasses}
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
