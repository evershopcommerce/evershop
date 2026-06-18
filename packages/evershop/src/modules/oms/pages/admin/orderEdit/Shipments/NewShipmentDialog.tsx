import { Badge } from '@components/common/ui/Badge.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@components/common/ui/Dialog.js';
import { Label } from '@components/common/ui/Label.js';
import { Switch } from '@components/common/ui/Switch.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import { Check, Minus, Plus, Truck } from 'lucide-react';
import React from 'react';
import { toast } from 'react-toastify';
import { hasTrackingCapability } from './carrierCaps.js';

export interface UnshippedItem {
  uuid: string;
  orderItemId: number;
  productSku: string;
  productName: string;
  qtyOrdered: number;
  qtyUnshipped: number;
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

interface DraftLine {
  order_item_id: number;
  qty: number;
  checked: boolean;
}

function QtyStepper({
  value,
  min,
  max,
  onChange
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="inline-flex items-center border border-divider rounded-md h-8 bg-background overflow-hidden">
      <button
        type="button"
        className="w-7 h-full grid place-items-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={_('Decrease')}
      >
        <Minus className="size-3.5" />
      </button>
      <input
        className="w-9 h-full text-center text-xs font-semibold tabular-nums border-x border-divider outline-none bg-background"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
          onChange(clamp(Number.isNaN(n) ? min : n));
        }}
        inputMode="numeric"
      />
      <button
        type="button"
        className="w-7 h-full grid place-items-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={_('Increase')}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Create Shipment modal. Triggered by the "Create shipment" button in the
 * Items card header. Shape per the multi-shipment UI design pass
 * (wiki/log.md → "Multi-shipment admin UI refactor"):
 *
 *   - Item picker rows — checkbox + thumbnail + name + "N of M available to
 *     ship" or "Fully shipped" + qty stepper visible when checked.
 *   - Carrier select + Tracking number input (2-col).
 *   - Notify customer Switch row with subtitle "Email a shipment
 *     confirmation with tracking details", default ON. Drives the
 *     `notifyCustomer` flag on the createShipment payload — the
 *     `shipment_created` event subscriber respects it.
 *   - Footer: "N units across M items" summary + Cancel + Create shipment.
 *
 * No "Generate label" radio (the earlier review decided drop — no built-in
 * carrier implements createLabel today; extensions own that flow).
 * No "Tracking URL" or "ETA" inputs (the schema has no columns for those).
 */
export function NewShipmentDialog({
  unshippedItems,
  carriers,
  defaultCarrierCode,
  createShipmentApi,
  onCreated
}: {
  unshippedItems: UnshippedItem[];
  carriers: Carrier[];
  defaultCarrierCode: string | null;
  createShipmentApi: string;
  onCreated: () => void;
}) {
  const isRegisteredHint =
    !!defaultCarrierCode &&
    carriers.some((c) => c.code === defaultCarrierCode);
  const initialCarrier = isRegisteredHint
    ? (defaultCarrierCode as string)
    : carriers[0]?.code ?? '';
  const [open, setOpen] = React.useState(false);
  const [carrier, setCarrier] = React.useState<string>(initialCarrier);
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [notifyCustomer, setNotifyCustomer] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<number, DraftLine>>(() =>
    seedDraft(unshippedItems)
  );

  // Re-seed the form ONLY when the dialog (re)opens — deliberately not on
  // unshippedItems/initialCarrier changes, which must not reset in-progress
  // edits while the dialog is open. (No eslint-disable: the react-hooks
  // plugin isn't registered in this repo's ESLint config, and a disable
  // comment for an unknown rule is itself a lint error.)
  React.useEffect(() => {
    if (!open) return;
    setDraft(seedDraft(unshippedItems));
    setTrackingNumber('');
    setNotifyCustomer(true);
    setCarrier(initialCarrier);
  }, [open]);

  const toggleLine = (orderItemId: number, checked: boolean) =>
    setDraft((d) => ({
      ...d,
      [orderItemId]: { ...d[orderItemId], checked }
    }));
  const setLineQty = (orderItemId: number, qty: number) =>
    setDraft((d) => ({
      ...d,
      [orderItemId]: { ...d[orderItemId], qty }
    }));

  const chosen = Object.values(draft).filter((d) => d.checked && d.qty > 0);
  const unitCount = chosen.reduce((n, d) => n + d.qty, 0);
  const itemCount = chosen.length;
  const canSubmit = chosen.length > 0;

  const selectedCarrier = carriers.find((c) => c.code === carrier);
  const showTrackingInput = hasTrackingCapability(selectedCarrier);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(_('Select at least one item to ship'));
      return;
    }
    if (!carrier) {
      toast.error(_('Select a carrier'));
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(createShipmentApi, {
        items: chosen.map((d) => ({
          order_item_id: d.order_item_id,
          qty: d.qty
        })),
        carrier,
        ...(showTrackingInput && trackingNumber.trim()
          ? { tracking_number: trackingNumber.trim() }
          : {}),
        notifyCustomer
      });
      toast.success(_('Shipment created'));
      setOpen(false);
      onCreated();
    } catch (e) {
      const err = e as {
        response?: { data?: { error?: { message?: string } } };
      };
      toast.error(
        err.response?.data?.error?.message ?? _('Failed to create shipment')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (unshippedItems.length === 0) return null;

  // Row data — combine unshipped (selectable) with the rest of order_items?
  // For now the picker only shows unshippedItems since they're the only
  // valid options. Digital items don't appear in unshippedItems (the
  // resolver filters them), so we don't render the "Digital · no shipping"
  // tag here either — the design's locked-digital-row is informational
  // and isn't required for the create flow to be correct. Keep the visual
  // hook open via the `selectable` flag for when a future extension wants
  // to surface them.
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm">
            <Plus className="size-4" />
            {_('Create shipment')}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-xl gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-4 text-muted-foreground" />
            {_('Create shipment')}
          </DialogTitle>
          <DialogDescription>
            {_(
              'Select the items going in this shipment, then add the carrier & tracking.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="border border-divider rounded-md overflow-hidden">
          {unshippedItems.map((item) => {
            const line = draft[item.orderItemId];
            if (!line) return null;
            const selectable = item.qtyUnshipped > 0;
            return (
              <div
                key={item.uuid}
                className={`flex items-center gap-3 px-3 py-2.5 border-b border-divider last:border-b-0 ${
                  line.checked ? 'bg-muted/30' : ''
                } ${!selectable ? 'opacity-50' : ''}`}
              >
                <CheckboxBox
                  checked={line.checked}
                  disabled={!selectable}
                  onChange={(v) => toggleLine(item.orderItemId, v)}
                />
                <div className="grow min-w-0">
                  <div className="font-semibold text-sm">
                    {item.productName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {selectable ? (
                      <>
                        {item.qtyUnshipped} {_('of')} {item.qtyOrdered}{' '}
                        {_('available to ship')}
                      </>
                    ) : (
                      <Badge variant="success">{_('Fully shipped')}</Badge>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {selectable && line.checked && (
                    <QtyStepper
                      value={line.qty}
                      min={1}
                      max={item.qtyUnshipped}
                      onChange={(q) => setLineQty(item.orderItemId, q)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={`grid gap-3 ${showTrackingInput ? 'grid-cols-2' : 'grid-cols-1'}`}
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
              <Label className="text-xs">
                {_('Tracking number')}{' '}
                <span className="font-normal text-muted-foreground">
                  {_('(optional)')}
                </span>
              </Label>
              <input
                className="h-9 px-3 border border-divider rounded-md bg-background text-sm focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                placeholder="e.g. 9400 1000 0000 0000"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* The text is a real <label> for the switch — clicking it toggles
            natively and the switch keeps its own keyboard semantics, so no
            click handler on a static container is needed (jsx-a11y). */}
        <div className="flex items-center gap-3 p-3 border border-divider rounded-md hover:bg-muted/30">
          <Switch
            id="new-shipment-notify-customer"
            checked={notifyCustomer}
            onCheckedChange={(v) => setNotifyCustomer(Boolean(v))}
          />
          <label
            htmlFor="new-shipment-notify-customer"
            className="grow cursor-pointer"
          >
            <div className="font-semibold text-sm">
              {_('Notify customer')}
            </div>
            <div className="text-xs text-muted-foreground">
              {showTrackingInput
                ? _('Email a shipment confirmation with tracking details')
                : _('Email a shipment confirmation')}
            </div>
          </label>
        </div>

        <DialogFooter className="!justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {canSubmit ? (
              <>
                <span className="font-bold text-foreground">{unitCount}</span>{' '}
                {unitCount === 1 ? _('unit') : _('units')} {_('across')}{' '}
                <span className="font-bold text-foreground">{itemCount}</span>{' '}
                {itemCount === 1 ? _('item') : _('items')}
              </>
            ) : (
              <span>{_('Select at least one item to ship')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              type="button"
            >
              {_('Cancel')}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSubmit}
              isLoading={submitting}
              disabled={!canSubmit}
              type="button"
            >
              <Truck className="size-4" />
              {_('Create shipment')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function seedDraft(items: UnshippedItem[]): Record<number, DraftLine> {
  const out: Record<number, DraftLine> = {};
  for (const item of items) {
    out[item.orderItemId] = {
      order_item_id: item.orderItemId,
      qty: item.qtyUnshipped,
      checked: item.qtyUnshipped > 0
    };
  }
  return out;
}

function CheckboxBox({
  checked,
  disabled,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="relative inline-block size-5 cursor-pointer flex-none">
      <input
        type="checkbox"
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={`absolute inset-0 grid place-items-center rounded-md border-2 transition ${
          checked
            ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-background border-divider'
        } ${disabled ? 'bg-muted border-divider' : ''}`}
      >
        {checked && <Check className="size-3" />}
      </span>
    </label>
  );
}
