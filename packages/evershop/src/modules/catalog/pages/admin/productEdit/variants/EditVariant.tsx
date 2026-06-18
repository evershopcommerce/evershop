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
import { Cog } from 'lucide-react';
import React from 'react';
import { VariantGroup } from '../VariantGroup.js';
import { VariantModal } from './VariantModal.js';
import { VariantItem } from './Variants.js';

export const EditVariant: React.FC<{
  variant: VariantItem;
  refresh: () => void;
  variantGroup: VariantGroup;
}> = ({ variant, variantGroup, refresh }) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger>
          <Button variant={'link'} className={'hover:cursor-pointer'}>
            <Cog className="w-5 h-5 text-primary" />
          </Button>
        </DialogTrigger>
        <DialogContent className={'sm:max-w-212.5'}>
          <DialogHeader>
            <DialogTitle>{_('Edit Variant')}</DialogTitle>
            <DialogDescription>
              {_('Update the variant details and attributes here.')}
            </DialogDescription>
          </DialogHeader>
          <VariantModal
            variant={variant}
            variantGroup={variantGroup}
            refresh={refresh}
            closeDialog={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
