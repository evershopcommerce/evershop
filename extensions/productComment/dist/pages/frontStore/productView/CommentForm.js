import React from 'react';
import { Form } from '@evershop/core/src/lib/components/form/Form';
import { Field } from '@evershop/core/src/lib/components/form/Field';
export default function ComponentForm({
  action,
  product
}) {
  const [error, setError] = React.useState(null);

  const onSuccess = response => {
    if (response.success) {
      window.location.reload();
    } else {
      setError(response.message);
    }
  };

  return /*#__PURE__*/React.createElement("div", {
    className: "product-comment-form"
  }, /*#__PURE__*/React.createElement("h3", null, "Your comment"), error && /*#__PURE__*/React.createElement("div", {
    className: "error"
  }, error), /*#__PURE__*/React.createElement(Form, {
    id: "comment-form",
    action: action,
    method: "POST",
    btnText: "Submit",
    onSuccess: onSuccess,
    isJSON: true
  }, /*#__PURE__*/React.createElement(Field, {
    name: "user_name",
    label: "Your Name",
    type: "text",
    validationRules: ['notEmpty']
  }), /*#__PURE__*/React.createElement(Field, {
    name: "comment",
    label: "Your Comment",
    type: "textarea",
    validationRules: ['notEmpty']
  }), /*#__PURE__*/React.createElement(Field, {
    type: "hidden",
    name: "product_id",
    value: product.productId
  })));
}
export const layout = {
  areaId: 'productPageMiddleLeft',
  sortOrder: 50
};
export const query = `
  query {
    action: url(routeId: "productComment"),
    product: product(id: getContextValue("productId")) {
      productId
    }
  }
`;