import RenderIfTrue from '@components/common/RenderIfTrue.js';
import { Button } from '@components/common/ui/Button.js';
import { CardContent } from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';

interface CaptureButtonProps {
  order: {
    canCapture: boolean;
    captureApi: string;
  };
}

/**
 * The one capture button, owned by core (OMS), not by any payment module. Shown
 * automatically for every payment method whose `Order.canCapture` is true
 * (capability + capturable status), and posts to the single core capture route.
 * No per-gateway button, no per-gateway route.
 */
export default function CaptureButton({
  order: { canCapture, captureApi }
}: CaptureButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const onAction = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(captureApi, {}, {
        validateStatus: () => true
      });
      if (!response.data.error) {
        // Reload the page
        window.location.reload();
      } else {
        toast.error(response.data.error.message);
        setIsLoading(false);
      }
    } catch (e) {
      setIsLoading(false);
      toast.error(e.message);
    }
  };

  return (
    <RenderIfTrue condition={canCapture}>
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

export const layout = {
  areaId: 'orderPaymentActions',
  sortOrder: 5
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      canCapture
      captureApi
    }
  }
`;
