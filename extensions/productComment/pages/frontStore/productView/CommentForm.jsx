import React from 'react';
import { Form } from '@components/common/form/Form';
import { Field } from '@components/common/form/Field';

export default function ComponentForm({ action, product }) {
  const [error, setError] = React.useState(null);

  const onSuccess = (response) => {
    if (response.success) {
      window.location.reload();
    } else {
      setError(response.error.message);
    }
  }

  return (
    <div className='product-comment-form'>
      <h3>Your comment</h3>
      {error && <div className='error text-critical'>{error}</div>}
      <Form
        id="comment-form"
        action={action}
        method="POST"
        btnText="Submit"
        onSuccess={onSuccess}
        isJSON={true}
      >
        <Field
          name="user_name"
          label="Your Name"
          type="text"
          validationRules={['notEmpty']}
        />
        <Field
          name="comment"
          label="Your Comment"
          type="textarea"
          validationRules={['notEmpty']}
        />
        <Field
          type='hidden'
          name='product_id'
          value={product.productId}
        />
      </Form>
    </div>
  );
}

export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 50
}

export const query = `
  query {
    action: url(routeId: "productComment"),
    product: product(id: getContextValue("productId")) {
      productId
    }
  }
`;