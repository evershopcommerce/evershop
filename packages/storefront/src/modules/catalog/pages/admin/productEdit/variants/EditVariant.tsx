import Button from '@components/common/Button.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { VariantGroup } from '../VariantGroup.js';
import { VariantModal } from './VariantModal.js';
import { VariantItem } from './Variants.js';

export const EditVariant: React.FC<{
  variant: VariantItem;
  refresh: () => void;
  variantGroup: VariantGroup;
}> = ({ variant, refresh, variantGroup }) => {
  const modal = useModal({
    onAfterClose: () => {
      refresh();
    }
  });

  return (
    <div>
      <a
        className="button"
        onClick={(e) => {
          e.preventDefault();
          modal.open();
        }}
        href="#"
      >
        Edit
      </a>
      <Modal isOpen={modal.isOpen} onClose={modal.close}>
        <VariantModal
          variant={variant}
          variantGroup={variantGroup}
          closeModal={modal.close}
        />
      </Modal>
    </div>
  );
};
