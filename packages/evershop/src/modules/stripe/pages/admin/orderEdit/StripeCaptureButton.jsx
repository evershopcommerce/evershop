import RenderIfTrue from '@components/common/RenderIfTrue';
import { Button } from '@components/common/ui/Button';
import { Card } from '@components/common/ui/Card';
import { CardContent } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import PropTypes from 'prop-types';
import React from 'react';
import { toast } from 'react-toastify';

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
        paymentStatus.code === 'stripe_authorized' && paymentMethod === 'stripe'
      }
    >
      <CardContent>
        <div className="flex justify-end">
          <Button onClick={onAction} isLoading={isLoading}>
            {_('Capture Payment')}
          </Button>
        </div>
      </CardContent>
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
