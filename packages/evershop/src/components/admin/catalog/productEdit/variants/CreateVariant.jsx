import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';
import { Form, useFormDispatch } from '@components/common/form/Form';
import { useModal } from '@components/common/modal/useModal';
import { Card } from '@components/admin/cms/Card';
import { VariantModal } from '@components/admin/catalog/productEdit/variants/VariantModal';
import { SubmitButton } from '@components/admin/catalog/productEdit/variants/SubmitButton';

export function CreateVariant({
  productId,
  variantGroup,
  createProductApi,
  addVariantItemApi,
  productImageUploadUrl,
  refresh
}) {
  const productFormContextDispatch = useFormDispatch();
  const modal = useModal();

  return (
    <div>
      <div className="mt-8">
        <Button
          title="Add Variant"
          onAction={() => {
            modal.openModal();
          }}
        />
      </div>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div
            className="modal-wrapper flex self-center justify-center items-center"
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal">
              <Form id="variantForm" submitBtn={false}>
                <Card title="Create a new variant">
                  <Card.Session>
                    <VariantModal
                      variantAttributes={variantGroup.attributes}
                      productImageUploadUrl={productImageUploadUrl}
                    />
                  </Card.Session>
                  <Card.Session>
                    <div className="flex justify-end">
                      <div className="grid grid-cols-2 gap-4">
                        <SubmitButton
                          productId={productId}
                          attributes={variantGroup.attributes}
                          createProductApi={createProductApi}
                          addVariantItemApi={addVariantItemApi}
                          productFormContextDispatch={
                            productFormContextDispatch
                          }
                          modal={modal}
                          refresh={refresh}
                        />
                        <Button
                          title="Cancel"
                          variant="secondary"
                          onAction={modal.closeModal}
                        />
                      </div>
                    </div>
                  </Card.Session>
                </Card>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

CreateVariant.propTypes = {
  productId: PropTypes.string.isRequired,
  variantGroup: PropTypes.shape({
    attributes: PropTypes.arrayOf(
      PropTypes.shape({
        attributeName: PropTypes.string,
        attributeId: PropTypes.number.isRequired,
        attributeCode: PropTypes.string.isRequired,
        attributeValues: PropTypes.arrayOf(
          PropTypes.shape({
            attributeValueId: PropTypes.string.isRequired,
            attributeValueName: PropTypes.string.isRequired
          })
        )
      })
    )
  }).isRequired,
  createProductApi: PropTypes.string.isRequired,
  addVariantItemApi: PropTypes.string.isRequired,
  productImageUploadUrl: PropTypes.string.isRequired,
  refresh: PropTypes.func.isRequired
};
