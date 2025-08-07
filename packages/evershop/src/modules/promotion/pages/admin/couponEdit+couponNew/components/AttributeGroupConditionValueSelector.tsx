import { AttributeGroupSelector } from '@components/admin/AttributeGroupSelector.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';

export const AttributeGroupConditionValueSelector: React.FC<{
  selectedValues: Array<number> | number;
  updateCondition: (values: number | Array<number>) => void;
  isMulti: boolean;
}> = ({ selectedValues, updateCondition, isMulti }) => {
  const skus = Array.isArray(selectedValues) ? selectedValues : [];
  const selectedIds = React.useRef(skus || []);
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

  const onUnSelect = async (id) => {
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
        {selectedIds.current.length === 0 && (
          <span>Choose Attribute Groups</span>
        )}
      </a>
      <Modal
        title="Select Attribute Groups"
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
          <AttributeGroupSelector
            onSelect={onSelect}
            onUnSelect={onUnSelect}
            selectedAttributeGroups={selectedIds.current.map((id) => ({
              attributeGroupId: id,
              uuid: undefined
            }))}
          />
        </div>
      </Modal>
    </div>
  );
};
