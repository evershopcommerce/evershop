import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { Rate, TaxRate } from './Rate.js';
import { RateForm } from './RateForm.js';

interface RatesProps {
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
  rates: Array<TaxRate>;
  addRateApi: string;
}
export function Rates({ getTaxClasses, rates, addRateApi }: RatesProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-none">{_('Name')}</TableHead>
            <TableHead className="border-none">{_('Country')}</TableHead>
            <TableHead className="border-none">{_('Rate')}</TableHead>
            <TableHead className="border-none">{_('Compound')}</TableHead>
            <TableHead className="border-none">{_('Priority')}</TableHead>
            <TableHead className="border-none">{_('Action')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((rate) => (
            <TableRow key={rate.uuid} className="border-divider py-5">
              <Rate rate={rate} getTaxClasses={getTaxClasses} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button
              variant="link"
              onClick={(e) => {
                e.preventDefault();
                setDialogOpen(true);
              }}
            >
              + {_('Add Rate')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{_('Add Tax Rate')}</DialogTitle>
            </DialogHeader>
            <RateForm
              saveRateApi={addRateApi}
              closeModal={() => setDialogOpen(false)}
              getTaxClasses={getTaxClasses}
            />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
