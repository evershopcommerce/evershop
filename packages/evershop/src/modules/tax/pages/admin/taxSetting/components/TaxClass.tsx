import { Card } from '@components/admin/Card.js';
import React from 'react';
import { TaxRate } from './Rate.js';
import { Rates } from './Rates.js';

interface TaxClassProps {
  taxClass: {
    name: string;
    rates: Array<TaxRate>;
    addRateApi: string;
  };
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
}

function TaxClass({ taxClass, getTaxClasses }: TaxClassProps) {
  return (
    <Card.Session
      title={
        <div className="flex justify-between items-center gap-5">
          <div>{taxClass.name}</div>
        </div>
      }
    >
      <div className="divide-y border rounded border-divider">
        <div className="flex justify-start items-center border-divider mt-5">
          <div className="flex-grow px-2">
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

export { TaxClass };
