import Button from '@components/common/Button.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { VariantGroup } from '../VariantGroup.js';
import { VariantModal } from './VariantModal.js';

export const CreateVariant: React.FC<{
  variantGroup: VariantGroup;
  createProductApi: string;
  refresh: () => void;
}> = ({ variantGroup, createProductApi, refresh }) => {
  const modal = useModal({
    onAfterClose: () => {
      refresh();
    }
  });
  return (
    <div>
      <div className="mt-5">
        <Button
          title="Add Variant"
          onAction={() => {
            modal.open();
          }}
        />
      </div>

      <Modal isOpen={modal.isOpen} onClose={modal.close}>
        <VariantModal
          variantGroup={variantGroup}
          createProductApi={createProductApi}
          closeModal={modal.close}
        />
      </Modal>
    </div>
  );
};
