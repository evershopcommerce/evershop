import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import Button from '@components/common/form/Button';
import { useFormDispatch } from '@components/common/form/Form';
import { serializeForm } from '@evershop/evershop/src/lib/util/formToJson';

export function SubmitButton({
  productId,
  createProductApi,
  addVariantItemApi,
  productFormContextDispatch,
  modal: { closeModal },
  refresh
}) {
  const { validate } = useFormDispatch();
  const [loading, setLoading] = React.useState(false);

  const createVariant = async () => {
    setLoading(true);
    const productFormErrors = productFormContextDispatch.validate();
    const variantFormErrors = validate();
    if (Object.keys(productFormErrors).length > 0) {
      setLoading(false);
      closeModal();
    } else if (Object.keys(variantFormErrors).length > 0) {
      setLoading(false);
    } else {
      const productFormData = new FormData(
        document.getElementById('productForm')
      );
      const variantFormData = new FormData(
        document.getElementById('variantForm')
      );

      // Merge product and variant form data
      const formData = new FormData();
      // eslint-disable-next-line no-restricted-syntax
      for (const [key, value] of productFormData.entries()) {
        formData.append(key, value);
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const [key, value] of variantFormData.entries()) {
        // If key not include 'attributes'
        if (key.indexOf('attributes') === -1) {
          formData.set(key, value);
        }
      }
      // Modify the url key to be unique
      formData.set(
        'url_key',
        `${formData.get('url_key')}-${formData.get('sku')}`
      );
      const productData = serializeForm(formData.entries());
      productData.attributes = productData.attributes || [];
      productData.attributes = productData.attributes.map((attribute) => {
        if (variantFormData.has(attribute.attribute_code)) {
          // eslint-disable-next-line no-param-reassign
          attribute.value = variantFormData.get(attribute.attribute_code);
        }
        return attribute;
      });

      const response = await fetch(createProductApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      const responseJson = await response.json();
      if (responseJson.error) {
        toast.error(responseJson.error.message);
        setLoading(false);
      } else {
        const responseMain = await fetch(addVariantItemApi, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_id: responseJson.data.uuid
          })
        });
        const responseMainJson = await responseMain.json();
        const responseVariant = await fetch(addVariantItemApi, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_id: productId
          })
        });
        const responseVariantJson = await responseVariant.json();

        const errorRes = responseMainJson.error || responseVariantJson.error;
        if (errorRes) {
          toast.error(errorRes.error.message);
          setLoading(false);
        } else {
          refresh();
          setLoading(false);
          closeModal();
        }
      }
    }
  };

  return (
    <Button
      title="Create"
      variant="primary"
      onAction={createVariant}
      isLoading={loading}
    />
  );
}

SubmitButton.propTypes = {
  addVariantItemApi: PropTypes.string.isRequired,
  createProductApi: PropTypes.string.isRequired,
  productFormContextDispatch: PropTypes.shape({
    validate: PropTypes.func.isRequired
  }).isRequired,
  productId: PropTypes.string.isRequired,
  refresh: PropTypes.func.isRequired,
  modal: PropTypes.shape({
    closeModal: PropTypes.func.isRequired
  }).isRequired
};
