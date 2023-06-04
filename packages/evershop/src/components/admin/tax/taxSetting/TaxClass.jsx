import React from 'react';
import { Card } from '@components/admin/cms/Card';
import { Rates } from './Rates';

TaxClass.propTypes = {};

function TaxClass({ taxClass, getTaxClasses }) {
  return (
    <Card.Session
      title={
        <div className="flex justify-between items-center gap-2">
          <div>{taxClass.name}</div>
        </div>
      }
    >
      <div className="divide-y border rounded border-divider">
        <div className="flex justify-start items-center border-divider mt-2">
          <div className="flex-grow px-1">
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

export default TaxClass;
