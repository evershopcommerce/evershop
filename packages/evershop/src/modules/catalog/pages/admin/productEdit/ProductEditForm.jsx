import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form';
import { get } from '@evershop/evershop/src/lib/util/get';

export default function ProductEditForm({ action }) {
  const id = 'productForm';
  return (
    <Form
      method="PATCH"
      action={action}
      dataFilter={(formData) => {
        if (formData.tax_class === '') {
          // eslint-disable-next-line no-param-reassign
          formData.tax_class = null;
        }
        if (formData.images === undefined) {
          // eslint-disable-next-line no-param-reassign
          formData.images = [];
        }
        return formData;
      }}
      onError={() => {
        toast.error('Something wrong. Please reload the page!');
      }}
      onSuccess={(response) => {
        if (response.error) {
          toast.error(
            get(
              response,
              'error.message',
              'Something wrong. Please reload the page!'
            )
          );
        } else {
          toast.success('Product saved successfully!');
        }
      }}
      submitBtn={false}
      id={id}
    >
      <Area id="productForm" noOuter />
    </Form>
  );
}

ProductEditForm.propTypes = {
  action: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateProduct", params: [{key: "id", value: getContextValue("productUuid")}]),
    gridUrl: url(routeId: "productGrid")
  }
`;
