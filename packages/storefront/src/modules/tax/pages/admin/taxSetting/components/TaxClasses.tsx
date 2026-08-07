import React from 'react';
import { TaxRate } from './Rate.js';
import { TaxClass } from './TaxClass.js';

interface TaxClassesProps {
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
  classes: Array<{
    uuid: string;
    name: string;
    rates: Array<TaxRate>;
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
