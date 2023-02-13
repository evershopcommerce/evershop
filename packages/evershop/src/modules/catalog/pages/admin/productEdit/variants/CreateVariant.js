import PropTypes from 'prop-types';
import React from 'react';
import Button from '../../../../../../lib/components/form/Button';
import {
  Form,
  useFormDispatch
} from '../../../../../../lib/components/form/Form';
import { useModal } from '../../../../../../lib/components/modal/useModal';
import { Card } from '../../../../../cms/components/admin/Card';
import { VariantModal } from './VariantModal';
import { SubmitButton } from './SubmitButton';

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
      <div className="mt-2">
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
                      <div className="grid grid-cols-2 gap-1">
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
        attributeId: PropTypes.string.isRequired,
        attributeType: PropTypes.string.isRequired,
        attributeValues: PropTypes.arrayOf(
          PropTypes.shape({
            attributeValueId: PropTypes.string.isRequired,
            attributeValueName: PropTypes.string.isRequired
          })
        )
      })
    )
  }).isRequired,
  createProductApi: PropTypes.func.isRequired,
  addVariantItemApi: PropTypes.func.isRequired,
  productImageUploadUrl: PropTypes.string.isRequired,
  refresh: PropTypes.func.isRequired
};
