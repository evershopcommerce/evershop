import { Card } from '@components/admin/Card.js';
import React from 'react';
import { Rates } from './Rates.jsx';

interface TaxClassProps {
  taxClass: {
    name: string;
    rates: Array<{
      uuid: string;
      country: string;
      province: string;
      postcode: string;
      isCompound: boolean;
      priority: number;
    }>;
    addRateApi: string;
  };
  getTaxClasses: () => Promise<void>;
}

function TaxClass({ taxClass, getTaxClasses }: TaxClassProps) {
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

export { TaxClass };
