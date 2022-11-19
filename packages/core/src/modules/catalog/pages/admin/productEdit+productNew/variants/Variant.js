/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/anchor-is-valid */
import axios from 'axios';
import React from 'react';
import PropTypes from 'prop-types';
import ProductMediaManager from '../Media';
import { VariantType } from './VariantType';
import { Field } from '../../../../../../lib/components/form/Field';
import { get } from '../../../../../../lib/util/get';

export function Variant({
  attributes, variant, removeVariant, updateVariant, unlinkApi, productImageUploadUrl
}) {
  const onUnlink = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('id', variant.product.productId);
    axios.post(unlinkApi, formData).then((response) => {
      if (response.data.success === true) {
        removeVariant(variant);
      } else {
        // TODO: Toast an error message
      }
    });
  };

  return (
    <div className="variant-item pb-15 border-b border-solid border-divider mb-15 last:border-b-0 last:pb-0">
      <input type="hidden" value={variant.product.productId} name={`variant_group[variants][${variant.id}][productId]`} />
      <div className="grid grid-cols-2 gap-x-1">
        <div className="col-span-1">
          <ProductMediaManager
            id={variant.id}
            product={variant?.product || {}}
            productImageUploadUrl={productImageUploadUrl}
          />
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-2 gap-x-1 border-b border-divider pb-15 mb-15">
            {attributes.map((a, i) => (
              <div key={a.attributeId} className="mt-1 col">
                <div><label>{a.attributeName}</label></div>
                <input type="hidden" value={a.attributeId} name={`variant_group[variants][${variant.id}][attributes][${i}][attribute]`} />
                <Field
                  name={`variant_group[variants][${variant.id}][attributes][${i}][value]`}
                  validationRules={['notEmpty']}
                  value={get(get(variant, 'attributes', []).find((e) => e.attributeCode === a.attributeCode), 'optionId', '')}
                  options={a.options}
                  onChange={(e) => {
                    updateVariant(
                      variant.id,
                      {
                        ...variant,
                        attributes: attributes.map((at) => {
                          const attr = variant.attributes.find(
                            (ax) => ax.attributeCode === at.attributeCode
                          )
                            ? variant.attributes.find(
                              (ax) => ax.attributeCode === at.attributeCode
                            )
                            : { attributeCode: at.attributeCode, attributeId: at.attributeId };
                          if (at.attributeCode === a.attributeCode) {
                            attr.optionId = e.target.value;
                            // eslint-disable-next-line max-len
                            attr.optionText = e.nativeEvent.target[e.nativeEvent.target.selectedIndex].text;
                          }
                          return attr;
                        })
                      }
                    );
                  }}
                  type="select"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-x-1 border-b border-divider pb-15 mb-15">
            <div>
              <div>SKU</div>
              <Field
                name={`variant_group[variants][${variant.id}][sku]`}
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant.product?.sku}
                type="text"
              />
            </div>
            <div>
              <div>Price</div>
              <Field
                name={`variant_group[variants][${variant.id}][price]`}
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant.product?.price?.regular?.value}
                type="text"
              />
            </div>
            <div>
              <div>Qty</div>
              <Field
                name={`variant_group[variants][${variant.id}][qty]`}
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant.product?.inventory?.qty}
                type="text"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-1">
            <div>
              <div>Status</div>
              <Field
                name={`variant_group[variants][${variant.id}][status]`}
                formId="product-edit-form"
                value={variant.product?.status}
                type="toggle"
              />
            </div>
            <div>
              <div>Visibility</div>
              <Field
                name={`variant_group[variants][${variant.id}][visibility]`}
                formId="product-edit-form"
                value={variant.visibility}
                type="toggle"
              />
            </div>

            <div>
              <div>Actions</div>
              <div><a href="#" className="text-critical" onClick={(e) => { e.preventDefault(); onUnlink(e); }}>Unlink</a></div>
              <div>{variant.editUrl && <a href={variant.editUrl} target="_blank" rel="noreferrer">Edit</a>}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Variant.propTypes = {
  attributes: PropTypes.arrayOf(PropTypes.shape({
    attributeName: PropTypes.string,
    attributeId: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
      optionId: PropTypes.number,
      optionText: PropTypes.string
    }))
  })).isRequired,
  removeVariant: PropTypes.func.isRequired,
  updateVariant: PropTypes.func.isRequired,
  variant: VariantType.isRequired
};
