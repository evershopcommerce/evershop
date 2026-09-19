import { Badge } from '@components/common/ui/Badge.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CheckCircle2, Package } from 'lucide-react';
import React from 'react';
import { NewShipmentDialog, type UnshippedItem } from './Shipments/NewShipmentDialog.js';
import { PhaseBadge } from './Shipments/phaseBadge.js';

interface VariantOption {
  attributeName?: string;
  attributeCode?: string;
  optionText?: string;
}

interface OrderItem {
  orderItemId: string;
  qty: number;
  productName: string;
  productSku: string;
  productUrl: string | null;
  thumbnail: string | null;
  noShippingRequired: boolean;
  variantOptions: VariantOption[] | null;
  productPrice: { value: number; text: string };
  lineTotal: { value: number; text: string };
  fulfillmentBadge: string;
}

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

interface ItemsProps {
  order: {
    items: OrderItem[];
    unshippedItems: UnshippedItem[];
    noShippingRequired: boolean;
    createShipmentApi: string;
    shippingMethodData: {
      snapshot?: { carrier?: string | null } | null;
    } | null;
  };
  carriers: Carrier[];
}

function ItemRow({
  item,
  unshippedMap
}: {
  item: OrderItem;
  unshippedMap: Map<number, number>;
}) {
  const isDigital = item.noShippingRequired;
  const remaining = unshippedMap.get(Number(item.orderItemId)) ?? 0;
  const showRemainHint =
    !isDigital &&
    item.fulfillmentBadge === 'partial_shipped' &&
    remaining > 0;

  return (
    <div
      className={`flex items-start gap-4 px-4 py-4 border-b border-divider last:border-b-0 ${
        isDigital ? 'bg-muted/30' : ''
      }`}
    >
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={item.productName}
          className="size-13 rounded-md object-cover border border-divider shrink-0"
        />
      ) : (
        <div className="size-13 rounded-md border border-divider bg-muted/40 shrink-0" />
      )}

      <div className="grow min-w-0">
        <div className="font-semibold text-sm">{item.productName}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          SKU: {item.productSku}
        </div>
        {item.variantOptions && item.variantOptions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {item.variantOptions.map((opt) => (
              <span
                key={`${opt.attributeCode ?? opt.attributeName}-${opt.optionText}`}
                className="text-xs text-muted-foreground whitespace-nowrap"
              >
                <span className="font-semibold">{opt.attributeName}:</span>{' '}
                {opt.optionText}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2">
          <PhaseBadge code={item.fulfillmentBadge} />
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {item.productPrice.text} × {item.qty}
        </div>
        <div className="font-bold text-sm whitespace-nowrap">
          {item.lineTotal.text}
        </div>
        {showRemainHint && (
          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap mt-0.5">
            {remaining} {_('left to ship')}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Items card. Sits at the top of the admin order-edit left column.
 * Header carries the "Create shipment" trigger (or "All items fulfilled"
 * badge when nothing is left). The body is the line-item list, each row
 * showing the per-item fulfillment badge from the server resolver and an
 * "N left to ship" hint when partial.
 *
 * The Shipments list lives in a sibling card (`Shipments.tsx`, sortOrder 15)
 * — the previous "Shipments-inside-Items via order_actions area" nesting is
 * gone with this refactor.
 */
export default function Items({ order, carriers }: ItemsProps) {
  const {
    items,
    unshippedItems,
    noShippingRequired,
    createShipmentApi,
    shippingMethodData
  } = order;

  const defaultCarrierCode = shippingMethodData?.snapshot?.carrier ?? null;
  const canCreateShipment = unshippedItems.length > 0 && !noShippingRequired;

  // Quick lookup from orderItemId → qtyUnshipped for the "N left to ship" hint.
  const unshippedMap = new Map<number, number>();
  for (const u of unshippedItems) unshippedMap.set(u.orderItemId, u.qtyUnshipped);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <CardTitle>{_('Items')}</CardTitle>
          <span className="inline-grid place-items-center min-w-5 h-5 px-1.5 bg-muted text-muted-foreground rounded-full text-xs font-semibold">
            {items.length}
          </span>
        </div>
        {noShippingRequired ? (
          <Badge variant="outline">{_('No shipping required')}</Badge>
        ) : canCreateShipment ? (
          <NewShipmentDialog
            unshippedItems={unshippedItems}
            carriers={carriers}
            defaultCarrierCode={defaultCarrierCode}
            createShipmentApi={createShipmentApi}
            onCreated={() => window.location.reload()}
          />
        ) : (
          <Badge variant="success">
            <CheckCircle2 className="size-3" />
            {_('All items fulfilled')}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {items.map((item) => (
          <ItemRow
            key={item.orderItemId}
            item={item}
            unshippedMap={unshippedMap}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      noShippingRequired
      createShipmentApi
      shippingMethodData {
        snapshot {
          carrier
        }
      }
      items {
        orderItemId
        qty
        productName
        productSku
        productUrl
        thumbnail
        noShippingRequired
        fulfillmentBadge
        variantOptions {
          attributeCode
          attributeName
          attributeId
          optionId
          optionText
        }
        productPrice {
          value
          text
        }
        lineTotal {
          value
          text
        }
      }
      unshippedItems {
        uuid
        orderItemId
        productSku
        productName
        qtyOrdered
        qtyUnshipped
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
