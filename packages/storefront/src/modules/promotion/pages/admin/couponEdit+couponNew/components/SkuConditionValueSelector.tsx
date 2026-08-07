import { ProductSelector } from '@components/admin/ProductSelector.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';

export const SkuConditionValueSelector: React.FC<{
  selectedValues: Array<string> | string;
  updateCondition: (values: string | Array<string>) => void;
  isMulti: boolean;
}> = ({ selectedValues, updateCondition, isMulti }) => {
  const skus = Array.isArray(selectedValues) ? selectedValues : [];
  const selectedSKUs = React.useRef(skus || []);
  const modal = useModal({
    onAfterClose: () => {
      updateCondition(selectedSKUs.current);
    }
  });

  const onSelect = (sku) => {
    if (!isMulti) {
      selectedSKUs.current = [sku];
      modal.close();
    } else {
      selectedSKUs.current = [...selectedSKUs.current, sku];
    }
  };

  const onUnSelect = (sku) => {
    const prev = selectedSKUs.current;
    selectedSKUs.current = prev.filter((s) => s !== sku);
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
        {selectedSKUs.current.map((sku, index) => (
          <span key={sku}>
            {index === 0 && <span className="italic">&lsquo;{sku}&rsquo;</span>}
            {index === 1 && (
              <span> and {selectedSKUs.current.length - 1} more</span>
            )}
          </span>
        ))}
        {selectedSKUs.current.length === 0 && <span>Choose SKUs</span>}
      </a>
      <Modal
        title="Select Products"
        onClose={modal.close}
        isOpen={modal.isOpen}
      >
        <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
          <ProductSelector
            onSelect={onSelect}
            onUnSelect={onUnSelect}
            selectedProducts={selectedSKUs.current.map((sku) => ({
              sku,
              uuid: undefined,
              productId: undefined
            }))}
          />
        </div>
      </Modal>
    </div>
  );
};
