import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { VariantGroup } from '../VariantGroup.js';
import { VariantModal } from './VariantModal.js';

export const CreateVariant: React.FC<{
  variantGroup: VariantGroup;
  createProductApi: string;
  refresh: () => void;
}> = ({ variantGroup, createProductApi, refresh }) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="mt-3">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger>
          <Button variant={'outline'}>{_('Add Variant')}</Button>
        </DialogTrigger>
        <DialogContent className={'sm:max-w-212.5'}>
          <DialogHeader>
            <DialogTitle>{_('New Variant')}</DialogTitle>
            <DialogDescription>
              {_('Create a new variant for this product.')}
            </DialogDescription>
          </DialogHeader>
          <VariantModal
            refresh={refresh}
            closeDialog={() => setDialogOpen(false)}
            variantGroup={variantGroup}
            createProductApi={createProductApi}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
