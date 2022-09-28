/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/anchor-is-valid */
import axios from 'axios';
import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '../../../../../../../lib/components/form/Field';
import ProductMediaManager from '../ProductMediaManager';
import { get } from '../../../../../../../lib/util/get';
import { useAppState } from '../../../../../../../lib/context/app';
import { VariantType } from './VariantType';

export function Variant({
  attributes, variant, removeVariant, updateVariant
}) {
  const unlinkApi = get(useAppState(), 'unlinkVariant');

  const onUnlink = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('id', variant.variant_product_id);
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
      <input type="hidden" value={variant.variant_product_id} name={`variant_group[variants][${variant.id}][productId]`} />
      <div className="grid grid-cols-2 gap-x-1">
        <div className="col-span-1">
          <ProductMediaManager id={variant.id} productImages={variant.images || []} />
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-2 gap-x-1 border-b border-divider pb-15 mb-15">
            {attributes.map((a, i) => (
              <div key={a.attribute_id} className="mt-1 col">
                <div><label>{a.attribute_name}</label></div>
                <input type="hidden" value={a.attribute_id} name={`variant_group[variants][${variant.id}][attributes][${i}][attribute]`} />
                <Field
                  name={`variant_group[variants][${variant.id}][attributes][${i}][value]`}
                  validationRules={['notEmpty']}
                  value={get(get(variant, 'attributes', []).find((e) => parseInt(e.attribute_id, 10) === parseInt(a.attribute_id, 10)), 'option_id', '')}
                  options={(() => a.options.map(
                    (o) => ({ value: parseInt(o.attribute_option_id, 10), text: o.option_text })
                  ))()}
                  onChange={(e) => {
                    updateVariant(
                      variant.id,
                      {
                        ...variant,
                        attributes: attributes.map((at) => {
                          const attr = variant.attributes.find(
                            (ax) => ax.attribute_code === at.attribute_code
                          )
                            ? variant.attributes.find(
                              (ax) => ax.attribute_code === at.attribute_code
                            )
                            : { attribute_code: at.attribute_code, attribute_id: at.attribute_id };
                          if (at.attribute_code === a.attribute_code) {
                            attr.option_id = e.target.value;
                            // eslint-disable-next-line max-len
                            attr.value_text = e.nativeEvent.target[e.nativeEvent.target.selectedIndex].text;
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
                value={variant.sku}
                type="text"
              />
            </div>
            <div>
              <div>Price</div>
              <Field
                name={`variant_group[variants][${variant.id}][price]`}
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant.price}
                type="text"
              />
            </div>
            <div>
              <div>Qty</div>
              <Field
                name={`variant_group[variants][${variant.id}][qty]`}
                formId="product-edit-form"
                validationRules={['notEmpty']}
                value={variant.qty}
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
                value={variant.status}
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
    attribute_name: PropTypes.string,
    attribute_id: PropTypes.string.string,
    options: PropTypes.arrayOf(PropTypes.shape({
      attribute_option_id: PropTypes.number,
      option_text: PropTypes.string
    }))
  })).isRequired,
  removeVariant: PropTypes.func.isRequired,
  updateVariant: PropTypes.func.isRequired,
  variant: VariantType.isRequired
};
