import PropTypes from 'prop-types';
import React from 'react';
import Button from '@components/common/form/Button';

export default function NewCouponButton({ newCouponUrl }) {
  return <Button url={newCouponUrl} title="New Coupon" />;
}

NewCouponButton.propTypes = {
  newCouponUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newCouponUrl: url(routeId: "couponNew")
  }
`;
