import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import RenderIfTrue from '@components/common/RenderIfTrue';
import axios from 'axios';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

export default function PaypalCaptureButton({
  captureAPI,
  order: { paymentStatus, uuid, paymentMethod }
}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const onAction = async () => {
    try {
      setIsLoading(true);
      // Use Axios to call the capture API
      const response = await axios.post(captureAPI, { order_id: uuid });
      if (!response.data.error) {
        // Reload the page
        window.location.reload();
      } else {
        toast.error(response.data.error.message);
      }
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
      toast.error(e.message);
    }
  };

  return (
    <RenderIfTrue
      condition={
        paymentMethod === 'paypal' && paymentStatus.code === 'authorized'
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

PaypalCaptureButton.propTypes = {
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
    captureAPI: url(routeId: "paypalCaptureAuthorizedPayment")
    order(uuid: getContextValue("orderId")) {
      uuid
      paymentStatus {
        code
      }
      paymentMethod
    }
  }
`;
