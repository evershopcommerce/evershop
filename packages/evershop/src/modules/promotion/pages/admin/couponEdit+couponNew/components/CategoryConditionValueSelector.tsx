import { CategorySelector } from '@components/admin/CategorySelector.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';

export const CategoryConditionValueSelector: React.FC<{
  selectedValues: Array<number> | number;
  updateCondition: (values: number | Array<number>) => void;
  isMulti: boolean;
}> = ({ selectedValues, updateCondition, isMulti }) => {
  const selectedIds = React.useRef<number[]>(
    Array.isArray(selectedValues) ? selectedValues.map(Number) : []
  );
  const modal = useModal({
    onAfterClose: () => {
      updateCondition(selectedIds.current);
    }
  });

  const onSelect = (id) => {
    if (!isMulti) {
      selectedIds.current = [id];
      modal.close();
    } else {
      const prev = selectedIds.current;
      if (!prev.includes(id)) {
        selectedIds.current = [id, ...prev];
      }
    }
  };

  const onUnSelect = (id) => {
    const prev = selectedIds.current;
    selectedIds.current = prev.filter((s) => s !== id);
  };

  return (
    <div>
      <a
        href="#"
        className="text-interactive hover:underline"
        onClick={(e) => {
          e.preventDefault();
          modal.open();
        }}
      >
        {selectedIds.current.map((id, index) => (
          <span key={id}>
            {index === 0 && <span className="italic">&lsquo;{id}&rsquo;</span>}
            {index === 1 && (
              <span> and {selectedIds.current.length - 1} more</span>
            )}
          </span>
        ))}
        {selectedIds.current.length === 0 && <span>Choose Categories</span>}
      </a>
      <Modal
        title="Select Categories"
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
          <CategorySelector
            onSelect={onSelect}
            onUnSelect={onUnSelect}
            selectedCategories={selectedIds.current.map((id) => ({
              categoryId: id,
              uuid: undefined
            }))}
          />
        </div>
      </Modal>
    </div>
  );
};
