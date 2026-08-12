import { AttributeGroupSelector } from '@components/admin/AttributeGroupSelector.js';
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

export const AttributeGroupConditionValueSelector: React.FC<{
  selectedValues: Array<number> | number;
  updateCondition: (values: number | Array<number>) => void;
  isMulti: boolean;
}> = ({ selectedValues, updateCondition, isMulti }) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const skus = Array.isArray(selectedValues) ? selectedValues : [];
  const selectedIds = React.useRef(skus || []);

  const onSelect = (id) => {
    if (!isMulti) {
      selectedIds.current = [id];
      setDialogOpen(false);
    } else {
      const prev = selectedIds.current;
      if (!prev.includes(id)) {
        selectedIds.current = [id, ...prev];
      }
    }
  };

  const onUnSelect = async (id) => {
    const prev = selectedIds.current;
    selectedIds.current = prev.filter((s) => s !== id);
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
            <span>{_('Choose Attribute Groups')}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className={'max-w-[60vw]'}>
        <DialogHeader>
          <DialogTitle>{_('Choose Attribute Groups')}</DialogTitle>
        </DialogHeader>
        <AttributeGroupSelector
          onSelect={onSelect}
          onUnSelect={onUnSelect}
          selectedAttributeGroups={selectedIds.current.map((id) => ({
            attributeGroupId: id,
            uuid: undefined
          }))}
        />
      </DialogContent>
    </Dialog>
  );
};
