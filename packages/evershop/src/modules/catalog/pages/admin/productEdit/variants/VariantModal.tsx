import { ImageUploader } from '@components/admin/ImageUploader.js';
import Spinner from '@components/admin/Spinner.js';
import { Field } from '@components/common/form/Field.js';
import { useFormContext } from '@components/common/form/Form.js';
import React, { useState } from 'react';
import { useQuery } from 'urql';
import { VariantAttribute } from '../VariantGroup.js';
import { VariantItem } from './Variants.js';

const AttributesQuery = `
  query Query($filters: [FilterInput]) {
    attributes(filters: $filters) {
      items {
        attributeId
        attributeCode
        attributeName
        options {
          value: attributeOptionId
          text: optionText
        }
      }
    }
  }
`;

export const VariantModal: React.FC<{
  variant?: VariantItem;
  variantAttributes: VariantAttribute[];
}> = ({ variant, variantAttributes }) => {
  const formContext = useFormContext();
  const [images, setImages] = useState(
    variant?.product?.image
      ? [variant?.product.image].concat(variant?.product?.gallery || [])
      : []
  );

  const [result] = useQuery({
    query: AttributesQuery,
    variables: {
      filters: [
        {
          key: 'code',
          operation: 'in',
          value: variantAttributes.map((a) => a.attributeCode).join(',')
        }
      ]
    }
  });

  const { data, fetching, error } = result;
  if (fetching) {
    return (
      <div className="p-3 flex justify-center items-center">
        <Spinner width={30} height={30} />
      </div>
    );
  }

  if (error) {
    return <p className="text-critical">{error.message}</p>;
  }
  return (
    <div className="variant-item pb-6 border-b border-solid border-divider mb-6 last:border-b-0 last:pb-0">
      <div className="grid grid-cols-2 gap-x-4">
        <div className="col-span-1">
          <ImageUploader
            currentImages={images}
            onDelete={(image) => {
              setImages((prevImages) =>
                prevImages.filter((i) => i.id !== image.id)
              );
            }}
            onUpload={(images) => {
              setImages((prevImages) => [...prevImages, ...images]);
            }}
            onSortEnd={(oldIndex, newIndex) => {
              const newImages = [...images];
              const [movedImage] = newImages.splice(oldIndex, 1);
              newImages.splice(newIndex, 0, movedImage);
              setImages(newImages);
            }}
          />
          {images.map((image) => (
            <input
              key={image.id}
              type="hidden"
              name="images[]"
              value={image.url}
            />
          ))}
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-2 gap-x-4 border-b border-divider pb-6 mb-6">
            {data?.attributes?.items.map((a, index) => (
              <div key={a.attributeId} className="mt-4 col">
                <div>
                  <label>{a.attributeName}</label>
                </div>
                <input
                  type="hidden"
                  name={`attributes[${index}][attribute_code]`}
                  value={a.attributeCode}
                />
                <input
                  type="hidden"
                  name={a.attributeCode}
                  value={
                    formContext.fields.find(
                      (f) => f.name === `attributes[${index}][value]`
                    )?.value
                  }
                />
                <Field
                  name={`attributes[${index}][value]`}
                  validationRules={['notEmpty']}
                  value={
                    variant?.attributes.find(
                      (v) => v.attributeCode === a.attributeCode
                    )?.optionId
                  }
                  options={a.options}
                  type="select"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-x-4 border-b border-divider pb-6 mb-6">
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
          <div className="grid grid-cols-3 gap-x-4">
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
};
