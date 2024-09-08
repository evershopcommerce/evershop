import PropTypes from 'prop-types';
import React from 'react';
import PageHeading from '@components/admin/cms/PageHeading';

export default function CouponEditPageHeading({ backUrl, coupon }) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={coupon ? `Editing ${coupon.coupon}` : 'Create a new coupon'}
    />
  );
}

CouponEditPageHeading.propTypes = {
  backUrl: PropTypes.string.isRequired,
  coupon: PropTypes.shape({
    coupon: PropTypes.string
  })
};

CouponEditPageHeading.defaultProps = {
  coupon: null
};

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    coupon(id: getContextValue("couponId", null)) {
      coupon
    }
    backUrl: url(routeId: "couponGrid")
  }
`;
