/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import PropTypes from 'prop-types';
import ProductMediaManager from '@components/admin/catalog/productEdit/media/ProductMediaManager';
import { Field } from '@components/common/form/Field';

export function VariantModal({
  variant,
  variantAttributes,
  productImageUploadUrl
}) {
  const image = variant?.product?.image;
  let gallery = variant?.product?.gallery || [];

  if (image) {
    gallery = [image].concat(gallery);
  }
  return (
    <div className="variant-item pb-15 border-b border-solid border-divider mb-15 last:border-b-0 last:pb-0">
      <div className="grid grid-cols-2 gap-x-1">
        <div className="col-span-1">
          <ProductMediaManager
            id="images"
            productImageUploadUrl={productImageUploadUrl}
            productImages={gallery}
          />
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-2 gap-x-1 border-b border-divider pb-15 mb-15">
            {variantAttributes.map((a) => (
              <div key={a.attributeId} className="mt-1 col">
                <div>
                  <label>{a.attributeName}</label>
                </div>
                <Field
                  name={a.attributeCode}
                  validationRules={['notEmpty']}
                  value={
                    variant?.attributes.find(
                      (v) => v.attributeCode === a.attributeCode
                    )?.optionId
                  }
                  options={a.options.map((o) => ({
                    value: o.optionId,
                    text: o.optionText
                  }))}
                  type="select"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-x-1 border-b border-divider pb-15 mb-15">
            <div>
              <div>SKU</div>
              <Field
                name="sku"
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant?.product?.sku}
                type="text"
              />
            </div>
            <div>
              <div>Qty</div>
              <Field
                name="qty"
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant?.product?.inventory?.qty}
                type="text"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-1">
            <div>
              <div>Status</div>
              <Field
                name="status"
                formId="product-edit-form"
                value={variant?.product?.status}
                type="toggle"
              />
            </div>
            <div>
              <div>Visibility</div>
              <Field
                name="visibility"
                formId="product-edit-form"
                value={variant?.product?.visibility}
                type="toggle"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

VariantModal.propTypes = {
  variant: PropTypes.shape({
    product: PropTypes.shape({
      image: PropTypes.string,
      gallery: PropTypes.arrayOf(PropTypes.string),
      sku: PropTypes.string,
      inventory: PropTypes.shape({
        qty: PropTypes.number
      }),
      status: PropTypes.number,
      visibility: PropTypes.number,
      attributes: PropTypes.arrayOf(
        PropTypes.shape({
          attributeCode: PropTypes.string,
          optionId: PropTypes.number
        })
      )
    }),
    attributes: PropTypes.arrayOf(
      PropTypes.shape({
        attributeCode: PropTypes.string,
        optionId: PropTypes.number
      })
    )
  }),
  variantAttributes: PropTypes.arrayOf(
    PropTypes.shape({
      attributeId: PropTypes.number,
      attributeName: PropTypes.string,
      attributeCode: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          optionId: PropTypes.number,
          optionText: PropTypes.string
        })
      )
    })
  ),
  productImageUploadUrl: PropTypes.string.isRequired
};

VariantModal.defaultProps = {
  variant: null,
  variantAttributes: []
};
