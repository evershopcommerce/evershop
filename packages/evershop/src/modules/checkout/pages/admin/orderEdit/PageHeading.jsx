import PropTypes from 'prop-types';
import React from 'react';
import PageHeading from '@components/admin/cms/PageHeading';

export default function OrderEditPageHeading({ backUrl, order }) {
  return (
    <PageHeading backUrl={backUrl} heading={`Editing #${order.orderNumber}`} />
  );
}

OrderEditPageHeading.propTypes = {
  backUrl: PropTypes.string.isRequired,
  order: PropTypes.shape({
    orderNumber: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    order(id: getContextValue("orderId", null)) {
      orderNumber
    }
    backUrl: url(routeId: "orderGrid")
  }
`;
