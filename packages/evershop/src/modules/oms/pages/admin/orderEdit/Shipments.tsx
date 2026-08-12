import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Truck } from 'lucide-react';
import React from 'react';
import { ShipmentRow, type Shipment } from './Shipments/ShipmentRow.js';

interface Carrier {
  code: string;
  name: string;
  capabilities?: {
    createLabel?: boolean;
    generateTrackingUrl?: boolean;
    voidLabel?: boolean;
    fetchStatus?: boolean;
  };
}

interface ShipmentsProps {
  order: {
    noShippingRequired: boolean;
    shipments: Shipment[];
  };
  carriers: Carrier[];
}

/**
 * Shipments card. Lifts out of the Items card (used to be injected via
 * `order_actions` Area inside Items) and lives as its own leftSide entry
 * sortOrder 15 — between Items (10) and Payment (20).
 *
 * The "Create shipment" button moved to the Items card header. This card
 * is purely a list of per-shipment sub-cards. Empty state hides the whole
 * card (the parent layout won't render an empty card frame).
 */
export default function Shipments({
  order: { noShippingRequired, shipments },
  carriers
}: ShipmentsProps) {
  if (noShippingRequired) return null;
  if (shipments.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-muted-foreground" />
          <CardTitle>{_('Shipments')}</CardTitle>
          <span className="inline-grid place-items-center min-w-5 h-5 px-1.5 bg-muted text-muted-foreground rounded-full text-xs font-semibold">
            {shipments.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {shipments.map((s) => (
          <ShipmentRow key={s.uuid} shipment={s} carriers={carriers} />
        ))}
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 15
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      noShippingRequired
      shipments {
        uuid
        shipmentId
        carrier
        carrierName
        trackingNumber
        trackingUrl
        labelUrl
        status {
          code
          name
          badge
          phase
        }
        phase
        shippedAt {
          text(format: "LLL dd, yyyy")
        }
        deliveredAt {
          text(format: "LLL dd, yyyy")
        }
        canceledAt {
          text(format: "LLL dd, yyyy")
        }
        createdAt {
          text(format: "LLL dd, yyyy")
        }
        items {
          uuid
          orderItemId
          qty
          productSku
          productName
          thumbnail
        }
        markDeliveredApi
        cancelShipmentApi
        voidShipmentLabelApi
      }
    }
    carriers {
      code
      name
      capabilities {
        createLabel
        generateTrackingUrl
        voidLabel
        fetchStatus
      }
    }
  }
`;
