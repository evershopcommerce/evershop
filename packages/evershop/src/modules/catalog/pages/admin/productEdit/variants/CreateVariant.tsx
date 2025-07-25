import Button from '@components/common/form/Button.js';
import { Form, useFormDispatch } from '@components/common/form/Form.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { VariantGroup } from '../VariantGroup.js';
import { SubmitButton } from './SubmitButton.js';
import { VariantModal } from './VariantModal.js';

export const CreateVariant: React.FC<{
  productId: string;
  variantGroup: VariantGroup;
  createProductApi: string;
  addVariantItemApi: string;
  refresh: () => void;
}> = ({
  productId,
  variantGroup,
  createProductApi,
  addVariantItemApi,
  refresh
}) => {
  const productFormContextDispatch = useFormDispatch();
  const modal = useModal();

  return (
    <div>
      <div className="mt-8">
        <Button
          title="Add Variant"
          onAction={() => {
            modal.open();
          }}
        />
      </div>
      <modal.Content title={'Create a new variant'}>
        <Form id="variantForm" submitBtn={false}>
          <VariantModal variantAttributes={variantGroup.attributes} />
          <div className="flex justify-end">
            <div className="grid grid-cols-2 gap-4">
              <SubmitButton
                productId={productId}
                createProductApi={createProductApi}
                addVariantItemApi={addVariantItemApi}
                productFormContextDispatch={productFormContextDispatch}
                modal={modal}
                refresh={refresh}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onAction={modal.close}
              />
            </div>
          </div>
        </Form>
      </modal.Content>
    </div>
  );
};
