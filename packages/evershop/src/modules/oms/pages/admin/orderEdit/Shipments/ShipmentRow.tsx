import { Button } from '@components/common/ui/Button.js';
import { ConfirmDialog } from '@components/common/ui/ConfirmDialog.js';
import { Label } from '@components/common/ui/Label.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import { Check, Clock, Edit2, ExternalLink, X } from 'lucide-react';
import React from 'react';
import { toast } from 'react-toastify';
import { hasTrackingCapability } from './carrierCaps.js';
import { PhaseBadge } from './phaseBadge.js';

export interface ShipmentItem {
  uuid: string;
  orderItemId: number;
  qty: number;
  productSku: string | null;
  productName: string | null;
  thumbnail: string | null;
}

export interface Shipment {
  uuid: string;
  shipmentId: number;
  carrier: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  status: {
    code: string;
    name: string;
    badge: string;
    phase: 'pending' | 'shipped' | 'delivered' | 'canceled' | string;
  };
  phase: 'pending' | 'shipped' | 'delivered' | 'canceled' | string;
  shippedAt: { text: string | null } | null;
  deliveredAt: { text: string | null } | null;
  canceledAt: { text: string | null } | null;
  createdAt: { text: string | null };
  items: ShipmentItem[];
  markDeliveredApi: string;
  cancelShipmentApi: string;
  voidShipmentLabelApi: string;
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

/**
 * Pulls the formatted `text` off a Shipment DateTime field. The GraphQL
 * `DateTime` type is an object (`{ value, timezone, text(format) }`) — the
 * query asks for `text(format: "LLL dd, yyyy")` so this just unwraps it.
 * Returns empty string when the field is null (e.g. shippedAt on a shipment
 * that went direct pending→delivered).
 */
function dateText(d: { text: string | null } | null): string {
  return d?.text ?? '';
}

/**
 * Per-shipment block inside the Shipments card.
 *
 * Layout per the design:
 *   - Top row: "Shipment #N" + phase status badge | carrier · tracking
 *   - Middle: items list (thumbnail + name + × qty)
 *   - Timeline: Created / Shipped / Delivered with clock icons
 *   - Action row: Mark delivered (when phase=shipped) | Edit tracking |
 *     Cancel shipment (until delivered/canceled) | Track → (when URL)
 *
 * Editing tracking swaps the action row for an inline `EditTrackingForm`
 * (carrier select + tracking number, Cancel + Save). Canceled shipments
 * dim out and drop all actions.
 */
export function ShipmentRow({
  shipment,
  carriers
}: {
  shipment: Shipment;
  carriers: Carrier[];
}) {
  const [editing, setEditing] = React.useState(false);
  const isCanceled = shipment.phase === 'canceled';
  const carrierEntry = shipment.carrier
    ? carriers.find((c) => c.code === shipment.carrier)
    : undefined;
  const carrierDisplay =
    shipment.carrierName ?? carrierEntry?.name ?? shipment.carrier;
  const trackHref = shipment.trackingUrl;
  const canVoidLabel =
    !!shipment.labelUrl &&
    // Shipments are born in the `shipped` phase (no `pending` state under the
    // current model), and voidShipmentLabel's service-side gate also requires
    // `shipped`. The old `pending` check meant the button never rendered.
    shipment.phase === 'shipped' &&
    !!carrierEntry?.capabilities?.voidLabel;

  const timeline = [
    { label: _('Created'), date: dateText(shipment.createdAt) },
    shipment.shippedAt?.text && {
      label: _('Shipped'),
      date: dateText(shipment.shippedAt)
    },
    shipment.deliveredAt?.text && {
      label: _('Delivered'),
      date: dateText(shipment.deliveredAt)
    },
    shipment.canceledAt?.text && {
      label: _('Canceled'),
      date: dateText(shipment.canceledAt)
    }
  ].filter(Boolean) as Array<{ label: string; date: string }>;

  // Confirmation now lives in the wrapping ConfirmDialog component
  // (shared, shadcn AlertDialog). These handlers just do the API call + toast +
  // reload; the dialog closes itself after onConfirm resolves.
  const handleMarkDelivered = async () => {
    try {
      await axios.post(shipment.markDeliveredApi);
      toast.success(_('Shipment marked delivered'));
      window.location.reload();
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: { message?: string } } };
      };
      toast.error(
        err.response?.data?.error?.message ?? _('Failed to mark delivered')
      );
    }
  };

  const handleCancel = async () => {
    try {
      await axios.post(shipment.cancelShipmentApi);
      toast.success(_('Shipment canceled'));
      window.location.reload();
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: { message?: string } } };
      };
      toast.error(
        err.response?.data?.error?.message ?? _('Failed to cancel shipment')
      );
    }
  };

  const handleVoidLabel = async () => {
    try {
      await axios.delete(shipment.voidShipmentLabelApi);
      toast.success(_('Label voided'));
      window.location.reload();
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: { message?: string } } };
      };
      toast.error(
        err.response?.data?.error?.message ?? _('Failed to void label')
      );
    }
  };

  return (
    <div
      className={`border border-divider rounded-md p-3.5 ${
        isCanceled ? 'opacity-60 bg-muted/30' : 'bg-background'
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">
            {_('Shipment')} #{shipment.shipmentId}
          </span>
          <PhaseBadge
            code={shipment.phase}
            fallbackLabel={shipment.status.name}
          />
        </div>
        {shipment.carrier && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {carrierDisplay}
            </span>
            {shipment.trackingNumber && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="font-mono tabular-nums">
                  {shipment.trackingNumber}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="my-3 py-3 border-y border-divider flex flex-col gap-2">
        {shipment.items.map((item) => (
          <div key={item.uuid} className="flex items-center gap-2.5">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.productName ?? ''}
                className="size-8 rounded-md object-cover border border-divider shrink-0"
              />
            ) : (
              <div className="size-8 rounded-md border border-divider bg-muted/40 shrink-0" />
            )}
            <span className="grow text-sm font-medium truncate">
              {item.productName ?? item.productSku ?? _('Item')}
            </span>
            <span className="shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
              × {item.qty}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
        {timeline.map((t) => (
          <span
            key={t.label}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          >
            <Clock className="size-3 text-muted-foreground/60" />
            {t.label} {t.date}
          </span>
        ))}
      </div>

      {editing ? (
        <EditTrackingForm
          shipment={shipment}
          carriers={carriers}
          onCancel={() => setEditing(false)}
        />
      ) : (
        !isCanceled && (
          <div className="flex flex-wrap items-center gap-2">
            {shipment.phase !== 'delivered' &&
              shipment.phase !== 'canceled' && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="default">
                      <Check className="size-4" />
                      {_('Mark delivered')}
                    </Button>
                  }
                  title={_('Mark shipment as delivered?')}
                  description={_(
                    'The customer will receive a delivery confirmation email.'
                  )}
                  confirmLabel={_('Mark delivered')}
                  onConfirm={handleMarkDelivered}
                />
              )}
            {shipment.phase !== 'delivered' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="size-3.5" />
                {_('Edit tracking info')}
              </Button>
            )}
            {shipment.phase !== 'delivered' && (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                  >
                    <X className="size-3.5" />
                    {_('Cancel shipment')}
                  </Button>
                }
                title={_('Cancel this shipment?')}
                description={_(
                  "Items in this shipment will return to the order's unshipped pool. This action cannot be undone."
                )}
                confirmLabel={_('Cancel shipment')}
                confirmVariant="destructive"
                onConfirm={handleCancel}
              />
            )}
            {shipment.labelUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(shipment.labelUrl!, '_blank')}
              >
                {_('Print Label')}
              </Button>
            )}
            {canVoidLabel && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline" size="sm">
                    {_('Void Label')}
                  </Button>
                }
                title={_('Void this shipping label?')}
                description={_(
                  'The carrier will mark the tracking number as invalid. You will need to purchase a new label if you still intend to ship.'
                )}
                confirmLabel={_('Void label')}
                confirmVariant="destructive"
                onConfirm={handleVoidLabel}
              />
            )}
            {trackHref && (
              <a
                href={trackHref}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
              >
                {_('Track')}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )
      )}
    </div>
  );
}

function EditTrackingForm({
  shipment,
  carriers,
  onCancel
}: {
  shipment: Shipment;
  carriers: Carrier[];
  onCancel: () => void;
}) {
  const [carrier, setCarrier] = React.useState(shipment.carrier ?? '');
  const [trackingNumber, setTrackingNumber] = React.useState(
    shipment.trackingNumber ?? ''
  );
  const [saving, setSaving] = React.useState(false);

  // Selected-carrier capability check. Tracking input shows only when the
  // selected carrier has at least one tracking-related method. Switching
  // FROM a no-capability carrier (Custom/Other) TO a real carrier reveals
  // the input live so the admin can fill it in.
  const selectedCarrier = carriers.find((c) => c.code === carrier);
  const showTrackingInput = hasTrackingCapability(selectedCarrier);

  const handleSave = async () => {
    if (!carrier) {
      toast.error(_('Carrier is required'));
      return;
    }
    setSaving(true);
    try {
      // PATCH /api/shipments/:uuid is the public REST contract — no GraphQL
      // field needed to surface the URL; the path is stable.
      await axios.patch(`/api/shipments/${shipment.uuid}`, {
        carrier,
        ...(showTrackingInput && trackingNumber.trim()
          ? { tracking_number: trackingNumber.trim() }
          : {})
      });
      toast.success(_('Tracking info updated'));
      window.location.reload();
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: { message?: string } } };
      };
      toast.error(
        err.response?.data?.error?.message ??
          _('Failed to update tracking info')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-divider pt-3 mt-1">
      <div
        className={`grid gap-3 ${
          showTrackingInput ? 'grid-cols-2' : 'grid-cols-1'
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">{_('Carrier')}</Label>
          <select
            className="h-9 px-3 border border-divider rounded-md bg-background text-sm focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          >
            {carriers.length === 0 ? (
              <option value="">{_('No carriers registered')}</option>
            ) : (
              carriers.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>
        {showTrackingInput && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{_('Tracking number')}</Label>
            <input
              className="h-9 px-3 border border-divider rounded-md bg-background text-sm focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end items-center gap-2 mt-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {_('Cancel')}
        </Button>
        <Button size="sm" onClick={handleSave} isLoading={saving}>
          {_('Save')}
        </Button>
      </div>
    </div>
  );
}
