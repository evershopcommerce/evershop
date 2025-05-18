import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';
import { get } from '../../../../../lib/util/get.js';

export default function CouponEditForm({ action }) {
  const id = 'couponForm';
  return (
    <Form
      method="PATCH"
      action={action}
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
          toast.success('Coupon saved successfully!');
        }
      }}
      submitBtn={false}
      id={id}
    >
      <Area id={id} noOuter />
    </Form>
  );
}

CouponEditForm.propTypes = {
  action: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateCoupon", params: [{key: "id", value: getContextValue("couponUuid")}]),
    gridUrl: url(routeId: "couponGrid")
  }
`;
