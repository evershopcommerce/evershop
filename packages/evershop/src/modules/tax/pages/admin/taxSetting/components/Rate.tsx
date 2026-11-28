import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { useAsyncAction } from '@components/common/ui/hooks/useAsyncAction.js';
import { Spinner } from '@components/common/ui/Spinner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { RateForm } from './RateForm.js';

export interface TaxRate {
  uuid: string;
  name: string;
  rate: number;
  isCompound: boolean;
  priority: number;
  country: string;
  /** Comma-separated region keys or `*`. */
  administrativeArea: string;
  /** Comma-separated postal codes or `*`. */
  postalCode: string;
  updateApi: string;
  deleteApi: string;
}
interface RateProps {
  rate: TaxRate;
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
}

function Rate({ rate, getTaxClasses }: RateProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [remove, removing] = useAsyncAction(async () => {
    await fetch(rate.deleteApi, {
      method: 'DELETE'
    });
    await getTaxClasses({ requestPolicy: 'network-only' });
  });
  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <td className="border-none py-2 w-1/5">{rate.name}</td>
        <td className="border-none py-2">{rate.country}</td>
        <td className="border-none py-2">{rate.administrativeArea}</td>
        <td className="border-none py-2">{rate.rate}%</td>
        <td className="border-none py-2">
          {rate.isCompound ? _('Yes') : _('No')}
        </td>
        <td className="border-none py-2">{rate.priority}</td>
        <td className="border-none py-2">
          <DialogTrigger>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              {_('Edit')}
            </a>
          </DialogTrigger>
          <a
            href="#"
            className="text-destructive ml-5 inline-flex items-center"
            aria-disabled={removing}
            onClick={(e) => {
              e.preventDefault();
              remove();
            }}
          >
            {removing ? <Spinner /> : _('Delete')}
          </a>
        </td>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{_('Edit Tax Rate')}</DialogTitle>
          </DialogHeader>
          <RateForm
            saveRateApi={rate.updateApi}
            closeModal={() => setDialogOpen(false)}
            getTaxClasses={getTaxClasses}
            rate={rate}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { Rate };
