import React from 'react';
import PropTypes from 'prop-types';
import Button from '../../../../../lib/components/form/Button';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Card } from '../../../../cms/components/admin/Card';

export default function CaptureButton({
  captureAPI,
  order: {
    paymentStatus,
    uuid,
    paymentMethod
  }
}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const onAction = async () => {
    setIsLoading(true);
    // Use Axios to call the capture API
    const response = await axios.post(captureAPI, { order_id: uuid }, { validateStatus: false });
    if (!response.data.error) {
      // Reload the page
      window.location.reload();
    } else {
      toast.error(response.data.error.message);
    }
    setIsLoading(false);
  };

  if (paymentStatus.code === 'pending' && paymentMethod === 'cod') {
    return (
      <Card.Session>
        <div className='flex justify-end'>
          <Button title="Capture" onAction={onAction} isLoading={isLoading} />
        </div>
      </Card.Session>
    )
  } else {
    return null;
  }
}

CaptureButton.propTypes = {
  captureAPI: PropTypes.string.isRequired,
  order: PropTypes.shape({
    paymentStatus: PropTypes.shape({
      code: PropTypes.string.isRequired
    }).isRequired,
    uuid: PropTypes.string.isRequired,
    paymentMethod: PropTypes.string.isRequired
  }).isRequired
}

export const layout = {
  areaId: "orderPaymentActions",
  sortOrder: 10
}

export const query = `
  query Query {
    captureAPI: url(routeId: "codCapturePayment")
    order(id: getContextValue("orderId")) {
      uuid
      paymentStatus {
        code
      }
      paymentMethod
    }
  }
`