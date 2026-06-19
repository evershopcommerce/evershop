import { CardContent } from '@components/common/ui/Card.js';
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
    <CardContent className="py-3 border-t border-border">
      <div className="text-xs uppercase font-semibold py-2">
        {taxClass.name}
      </div>
      <div className="divide-y border rounded border-divider">
        <div className="flex justify-start items-center border-divider mt-5">
          <div className="grow px-2">
            <Rates
              rates={taxClass.rates}
              addRateApi={taxClass.addRateApi}
              getTaxClasses={getTaxClasses}
            />
          </div>
        </div>
      </div>
    </CardContent>
  );
}

export { TaxClass };
