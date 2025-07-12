import { Card } from '@components/admin/cms/Card';
import PropTypes from 'prop-types';
import React from 'react';
import { Rates } from './Rates';

function TaxClass({ taxClass, getTaxClasses }) {
  return (
    <Card.Session
      title={
        <div className="flex justify-between items-center gap-8">
          <div>{taxClass.name}</div>
        </div>
      }
    >
      <div className="divide-y border rounded border-divider">
        <div className="flex justify-start items-center border-divider mt-8">
          <div className="flex-grow px-4">
            <Rates
              rates={taxClass.rates}
              addRateApi={taxClass.addRateApi}
              getTaxClasses={getTaxClasses}
            />
          </div>
        </div>
      </div>
    </Card.Session>
  );
}

TaxClass.propTypes = {
  taxClass: PropTypes.shape({
    name: PropTypes.string.isRequired,
    rates: PropTypes.arrayOf(
      PropTypes.shape({
        uuid: PropTypes.string.isRequired,
        country: PropTypes.string.isRequired,
        province: PropTypes.string.isRequired,
        postcode: PropTypes.string.isRequired,
        isCompound: PropTypes.bool.isRequired,
        priority: PropTypes.number.isRequired
      })
    ),
    addRateApi: PropTypes.string.isRequired
  }).isRequired,
  getTaxClasses: PropTypes.func.isRequired
};

export default TaxClass;
