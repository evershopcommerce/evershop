import React from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import axios from 'axios';
import Button from '@components/common/form/Button';
import { Card } from '@components/admin/cms/Card';
import RenderIfTrue from '@components/common/RenderIfTrue';

export default function StripeCaptureButton({
  captureAPI,
  order: { paymentStatus, uuid, paymentMethod }
}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const onAction = async () => {
    setIsLoading(true);
    // Use Axios to call the capture API
    const response = await axios.post(
      captureAPI,
      { order_id: uuid },
      { validateStatus: false }
    );
    if (!response.data.error) {
      // Reload the page
      window.location.reload();
    } else {
      toast.error(response.data.error.message);
    }
    setIsLoading(false);
  };

  return (
    <RenderIfTrue
      condition={
        paymentStatus.code === 'authorized' && paymentMethod === 'stripe'
      }
    >
      <Card.Session>
        <div className="flex justify-end">
          <Button title="Capture" onAction={onAction} isLoading={isLoading} />
        </div>
      </Card.Session>
    </RenderIfTrue>
  );
}

StripeCaptureButton.propTypes = {
  captureAPI: PropTypes.string.isRequired,
  order: PropTypes.shape({
    paymentStatus: PropTypes.shape({
      code: PropTypes.string.isRequired
    }).isRequired,
    uuid: PropTypes.string.isRequired,
    paymentMethod: PropTypes.string.isRequired
  }).isRequired
};

export const layout = {
  areaId: 'orderPaymentActions',
  sortOrder: 10
};

export const query = `
  query Query {
    captureAPI: url(routeId: "capturePaymentIntent")
    order(uuid: getContextValue("orderId")) {
      uuid
      paymentStatus {
        code
      }
      paymentMethod
    }
  }
`;
