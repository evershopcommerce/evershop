import { ImageUploader } from '@components/admin/ImageUploader.js';
import Spinner from '@components/admin/Spinner.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import { DialogClose, DialogFooter } from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import { AtLeastOne } from '../../../../../../types/atLeastOne.js';
import { VariantGroup } from '../VariantGroup.js';
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
          label: optionText
        }
      }
    }
  }
`;

export const VariantModal: React.FC<
  AtLeastOne<{
    variant: VariantItem;
    createProductApi: string;
  }> & {
    variantGroup: VariantGroup;
    refresh: () => void;
    closeDialog: () => void;
  }
> = ({ variant, variantGroup, createProductApi, refresh, closeDialog }) => {
  const [saving, setSaving] = useState(false);
  const { watch, register, control } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray({
    name: 'variant_images',
    control
  }) as ReturnType<typeof useFieldArray>;
  const variantData = watch([
    'url_key',
    'variant_sku',
    'variant_visibility',
    'variant_qty',
    'variant_status',
    'variant_attributes',
    'variant_images'
  ]);
  const { getValues, trigger } = useFormContext();
  const addVariantItem = async (uuid, addVariantItemApi) => {
    const response = await fetch(addVariantItemApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: uuid
      })
    });
    const responseJson = await response.json();
    return responseJson;
  };

  const saveVariant = async () => {
    setSaving(true);
    const productFormData = getValues();
    const formData = {
      ...productFormData,
      product_id: variant?.product.productId || '',
      sku: variantData[1],
      visibility: variantData[2],
      qty: variantData[3],
      status: variantData[4],
      url_key: `${variantData[0]}-${variantData[1]}`,
      images: (variantData[6] || []).map((image) => image.url),
      attributes:
        productFormData.attributes?.map((attr) => {
          if (variantData[5]?.[attr.attribute_code]) {
            return {
              ...attr,
              value: variantData[5][attr.attribute_code]
            };
          }
          return attr;
        }) || []
    };
    const response = await fetch(
      variant ? variant.product.updateApi : (createProductApi as string),
      {
        method: variant ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      }
    );
    const responseJson = await response.json();
    if (responseJson.error) {
      toast.error(responseJson.error.message);
    } else if (!variant) {
      const addVariantResponse = await addVariantItem(
        responseJson.data.uuid,
        variantGroup.addItemApi
      );
      if (addVariantResponse.error) {
        toast.error(addVariantResponse.error.message);
      } else {
        toast.success(_('Variant created successfully'));
        // Close the dialog
        closeDialog();
        // Refresh the page to reflect the changes
        refresh();
      }
    } else {
      toast.success(_('Variant updated successfully'));
      // Close the dialog
      closeDialog();
      // Refresh the page to reflect the changes
      refresh();
    }
    setSaving(false);
  };

  useEffect(() => {
    if (variant) {
      const images = variant?.product.image
        ? [variant.product.image].concat(variant.product.gallery || [])
        : [];
      replace(
        images.map((image) => ({
          uuid: image.uuid,
          path: image.path,
          url: image.url
        }))
      );
    }
  }, []);

  const [result] = useQuery({
    query: AttributesQuery,
    variables: {
      filters: [
        {
          key: 'code',
          operation: 'in',
          value: variantGroup.attributes.map((a) => a.attributeCode).join(',')
        }
      ]
    }
  });

  const { data, fetching, error } = result;
  if (fetching) {
    return (
      <div className="p-2 flex justify-center items-center">
        <Spinner width={30} height={30} />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-x-5">
        <div className="col-span-1">
          <ImageUploader
            currentImages={
              variant?.product.image
                ? [variant.product.image].concat(variant.product.gallery || [])
                : []
            }
            allowDelete={true}
            allowSwap={true}
            onDelete={(image) => {
              const index = fields.findIndex(
                (field) => field.uuid === image.uuid
              );
              if (index !== -1) {
                remove(index);
              }
            }}
            onUpload={(images) => {
              const newImages = images.map((image) => ({
                id: image.uuid,
                path: image.path,
                url: image.url
              }));
              append(newImages);
            }}
            onSortEnd={(oldIndex, newIndex) => {
              const newImages = [...fields];
              const [movedImage] = newImages.splice(oldIndex, 1);
              newImages.splice(newIndex, 0, movedImage);
              replace(newImages);
            }}
            targetPath={`catalog/${
              Math.floor(Math.random() * (9999 - 1000)) + 1000
            }/${Math.floor(Math.random() * (9999 - 1000)) + 1000}`}
          />
        </div>
        <div className="col-span-1">
          <div className="grid grid-cols-2 gap-x-2 border-b border-border pb-4 mb-4">
            {data.attributes.items.map((a) => (
              <div key={a.attributeCode} className="mt-2 col">
                <SelectField
                  name={`variant_attributes.${a.attributeCode}`}
                  label={a.attributeName}
                  placeholder={_('Select an option')}
                  required
                  validation={{
                    required: _('This field is required')
                  }}
                  defaultValue={
                    variant?.attributes
                      .find((attr) => attr.attributeCode === a.attributeCode)
                      ?.optionId.toString() || ''
                  }
                  options={a.options}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-x-2 border-b border-border pb-4 mb-4">
            <div>
              <InputField
                name="variant_sku"
                label={_('Sku')}
                placeholder={_('Enter SKU')}
                required
                validation={{
                  required: _('SKU is required')
                }}
                defaultValue={variant?.product?.sku}
              />
            </div>
            <div>
              <NumberField
                name="variant_qty"
                label={_('Quantity')}
                required
                placeholder={_('Enter quantity')}
                validation={{
                  required: _('Qty is required')
                }}
                allowDecimals={false}
                defaultValue={variant?.product?.inventory?.qty || 0}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-2">
            <div>
              <ToggleField
                name="variant_status"
                label={_('Status')}
                trueValue={true}
                falseValue={false}
                defaultValue={variant?.product.status === 1}
              />
            </div>
            <div>
              <ToggleField
                name="variant_visibility"
                label={_('Visibility')}
                trueValue={true}
                falseValue={false}
                defaultValue={variant?.product.visibility === 1}
              />
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose>
          <Button variant="outline">{_('Cancel')}</Button>
        </DialogClose>
        <Button
          isLoading={saving}
          onClick={async () => {
            const isValid = await trigger();
            if (isValid) {
              await saveVariant();
            }
          }}
        >
          {_('Save')}
        </Button>
      </DialogFooter>
    </>
  );
};
