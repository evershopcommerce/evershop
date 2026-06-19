import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { RatePanel } from './RatePanel.js';

interface ZoneInfo {
  shippingZoneId: number;
  uuid: string;
  name: string;
}

interface MethodRate {
  coreShippingMethodRateId: number;
  uuid: string;
  zoneId: number;
  zone: ZoneInfo | null;
  isEnabled: boolean;
  cost: { value: number; text: string } | null;
  conditionType: string | null;
  min: number | null;
  max: number | null;
  /** Per-rate endpoints, resolved server-side via `buildUrl` (keyed by uuid). */
  updateApi: string;
  deleteApi: string;
}

interface ExistingMethod {
  uuid: string;
  name: string;
  isEnabled: boolean;
  sortOrder: number;
  defaultCarrierCode: string | null;
  defaultServiceCode: string | null;
  rates: MethodRate[];
  /** POST endpoint for creating a new rate (method + zone go in the body). */
  addRateApi: string;
}

interface CarrierOption {
  code: string;
  name: string;
}

interface MethodFormProps {
  method?: ExistingMethod;
  coreZones: ZoneInfo[];
  /** Enabled registered carriers — empty list disables the default-carrier field. */
  carriers: CarrierOption[];
  onSaved: () => void;
}

/**
 * Core method form. Two-section layout:
 *   1. Method identity — name, status, sort order. Saves via POST/PATCH.
 *   2. Zone rates — a list of the rates already configured (each Editable /
 *      Deletable via its own endpoint), plus an "Add Rate" button that opens a
 *      create dialog with a zone picker for any zone not yet rated.
 *
 * Splitting rate config into its own modal keeps the method form readable;
 * a future polish pass can inline the rate editor as an accordion if needed.
 */
export function MethodForm({
  method,
  coreZones,
  carriers,
  onSaved
}: MethodFormProps) {
  const form = useForm();
  const [editingRate, setEditingRate] = React.useState<MethodRate | null>(null);
  const [addingRate, setAddingRate] = React.useState(false);

  const rates = method?.rates ?? [];
  // Zones where Core is attached but not yet rated — the only targets for a new
  // rate (one rate per (method, zone), enforced by the DB).
  const ratedZoneIds = new Set(
    rates.map((r) => r.zone?.shippingZoneId).filter((id): id is number => !!id)
  );
  const availableZones = coreZones.filter(
    (z) => !ratedZoneIds.has(z.shippingZoneId)
  );

  const isCreate = !method;
  const action = isCreate
    ? '/api/shippingProviders/core/methods'
    : `/api/shippingProviders/core/methods/${method!.uuid}`;
  const httpMethod = isCreate ? 'POST' : 'PATCH';

  return (
    <div className="space-y-4">
      <Form
        id={
          isCreate
            ? 'coreMethodCreateForm'
            : `coreMethodEditForm_${method!.uuid}`
        }
        method={httpMethod}
        action={action}
        form={form}
        submitBtn={false}
        onSuccess={async (response) => {
          if (response?.error) {
            toast.error(response.error.message);
            return;
          }
          toast.success(isCreate ? _('Method created') : _('Method updated'));
          onSaved();
        }}
        onError={(err) => toast.error(String(err))}
      >
        <div className="space-y-3">
          <InputField
            name="name"
            label={_('Method name')}
            placeholder={_('e.g., Express')}
            required
            validation={{ required: _('Method name is required') }}
            defaultValue={method?.name ?? ''}
          />
          <div className="grid grid-cols-2 gap-3">
            <ToggleField
              name="is_enabled"
              label={_('Status')}
              trueLabel={_('Enabled')}
              falseLabel={_('Disabled')}
              defaultValue={method?.isEnabled ?? true}
            />
            <NumberField
              name="sort_order"
              label={_('Sort order')}
              defaultValue={method?.sortOrder ?? 0}
              helperText={_('Lower values appear first.')}
            />
          </div>

          {carriers.length > 0 && (
            <>
              <SelectField
                name="default_carrier_code"
                label={_('Default carrier')}
                options={[
                  { value: '', label: _('— None —') },
                  ...carriers.map((c) => ({ value: c.code, label: c.name }))
                ]}
                defaultValue={method?.defaultCarrierCode ?? ''}
                helperText={_(
                  'Carrier hint for fulfillment — never shown at checkout. NewShipmentDialog uses this to pre-select the carrier.'
                )}
              />
              <InputField
                name="default_service_code"
                label={_('Default service code')}
                placeholder={_('e.g., FEDEX_GROUND, usps_priority')}
                defaultValue={method?.defaultServiceCode ?? ''}
                helperText={_(
                  "Carrier-specific service code used when buying a label (CreateLabelInput.serviceCode). Free-form — verify the exact token in the carrier's API docs. Leave blank to let the carrier pick its default service."
                )}
              />
            </>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="default"
              onClick={async () => {
                const valid = await form.trigger();
                if (!valid) return;
                const f = document.getElementById(
                  isCreate
                    ? 'coreMethodCreateForm'
                    : `coreMethodEditForm_${method!.uuid}`
                ) as HTMLFormElement | null;
                f?.dispatchEvent(
                  new Event('submit', { cancelable: true, bubbles: true })
                );
              }}
            >
              {isCreate ? _('Create method') : _('Save method')}
            </Button>
          </div>
        </div>
      </Form>

      {!isCreate && (
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs uppercase tracking-wide">
              {_('Zone Rates')}
            </h3>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={availableZones.length === 0}
              onClick={() => setAddingRate(true)}
            >
              {_('+ Add Rate')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {_(
              "Configure cost and conditions per zone. Zones without a rate don't offer this method."
            )}
          </p>
          {coreZones.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {_(
                "Core isn't attached to any zone yet. Attach it under Settings → Shipping first."
              )}
            </p>
          ) : rates.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {_(
                'No rates yet — click "Add Rate" to offer this method in a zone.'
              )}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{_('Zone')}</TableHead>
                  <TableHead>{_('Rate')}</TableHead>
                  <TableHead>{_('Condition')}</TableHead>
                  <TableHead className="text-right">{_('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.uuid}>
                    <TableCell className="font-medium">
                      {rate.zone?.name ?? '—'}
                    </TableCell>
                    <TableCell>{rate.cost?.text ?? _('Tiered')}</TableCell>
                    <TableCell className="text-sm">
                      {rate.conditionType
                        ? `${rate.conditionType} ${rate.min ?? 0}–${
                            rate.max ?? '∞'
                          }`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRate(rate)}
                      >
                        {_('Edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Edit an existing rate */}
      <Dialog
        open={!!editingRate}
        onOpenChange={(open) => !open && setEditingRate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRate
                ? _('${method} — ${zone} rate', {
                    method: method!.name,
                    zone: editingRate.zone?.name ?? ''
                  })
                : _('Configure rate')}
            </DialogTitle>
          </DialogHeader>
          {editingRate && method && (
            <RatePanel
              existing={editingRate}
              createApi={method.addRateApi}
              methodUuid={method.uuid}
              availableZones={[]}
              onSaved={() => {
                setEditingRate(null);
                onSaved();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add a new rate for a not-yet-rated zone */}
      <Dialog
        open={addingRate}
        onOpenChange={(open) => !open && setAddingRate(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {method
                ? _('${method} — new rate', { method: method.name })
                : _('New rate')}
            </DialogTitle>
          </DialogHeader>
          {addingRate && method && (
            <RatePanel
              existing={null}
              createApi={method.addRateApi}
              methodUuid={method.uuid}
              availableZones={availableZones}
              onSaved={() => {
                setAddingRate(false);
                onSaved();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
