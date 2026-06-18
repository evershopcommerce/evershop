import { CollectionSelector } from '@components/admin/CollectionSelector.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export const CollectionConditionValueSelector: React.FC<{
  selectedValues: Array<number> | number;
  updateCondition: (values: number | Array<number>) => void;
  isMulti: boolean;
}> = ({ selectedValues, updateCondition, isMulti }) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const selectedIds = React.useRef<number[]>(
    Array.isArray(selectedValues) ? selectedValues.map(Number) : []
  );

  const onSelect = async (id) => {
    if (!isMulti) {
      selectedIds.current = [id];
      setDialogOpen(false);
      return Promise.resolve();
    }

    const prev = selectedIds.current;
    if (!prev.includes(id)) {
      selectedIds.current = [id, ...prev];
    }
    return Promise.resolve();
  };

  const onUnSelect = async (id) => {
    const prev = selectedIds.current;
    selectedIds.current = prev.filter((s) => s !== id);
    return Promise.resolve();
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => setDialogOpen(open)}
      onOpenChangeComplete={(open) => {
        if (!open) {
          updateCondition(selectedIds.current);
        }
      }}
    >
      <DialogTrigger>
        <Button variant={'link'}>
          {selectedIds.current.map((id, index) => (
            <span key={id}>
              {index === 0 && (
                <span className="italic">&lsquo;{id}&rsquo;</span>
              )}
              {index === 1 && (
                <span>
                  {' '}
                  {_('and ${count} more', {
                    count: String(selectedIds.current.length - 1)
                  })}
                </span>
              )}
            </span>
          ))}
          {selectedIds.current.length === 0 && (
            <span>{_('Choose Collections')}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{_('Choose Collections')}</DialogTitle>
        </DialogHeader>
        <CollectionSelector
          onSelect={onSelect}
          onUnSelect={onUnSelect}
          selectedCollections={selectedIds.current.map((id) => ({
            collectionId: id,
            uuid: undefined
          }))}
        />
      </DialogContent>
    </Dialog>
  );
};
