import { Card } from '@components/admin/Card.js';
import Button from '@components/common/Button.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';

interface Props {
  captureAPI: string;
  order: {
    paymentStatus: {
      code: string;
    };
    uuid: string;
    paymentMethod: string;
  };
}

export default function PaypalCaptureButton({
  captureAPI,
  order: { paymentStatus, uuid, paymentMethod }
}: Props) {
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
