import { Form, useFormContext } from '@components/common/form/Form.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import { ConfirmDialog } from '@components/common/ui/ConfirmDialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { PriceBasedPrice } from '../../shippingSetting/shippingSetting/PriceBasedPrice.js';
import { WeightBasedPrice } from '../../shippingSetting/shippingSetting/WeightBasedPrice.js';

interface ExistingRate {
  coreShippingMethodRateId: number;
  uuid: string;
  isEnabled: boolean;
  cost: { value: number; text: string } | null;
  conditionType: string | null;
  min: number | null;
  max: number | null;
  /** Resolved server-side via `buildUrl` — keyed by the rate uuid. */
  updateApi: string;
  deleteApi: string;
}

interface ZoneOption {
  uuid: string;
  name: string;
}

interface RatePanelProps {
  /**
   * Edit mode when set — carries the rate's own update/delete endpoints.
   * Null switches the panel to create mode.
   */
  existing: ExistingRate | null;
  /** Create mode: POST endpoint for new rates (`CoreShippingMethod.addRateApi`). */
  createApi: string;
  /** Create mode: method UUID, sent in the create body. */
  methodUuid: string;
  /** Create mode: zones the new rate can target (core zones without a rate yet). */
  availableZones: ZoneOption[];
  onSaved: () => void;
}

type CalculationType = 'flat_rate' | 'price_based_rate' | 'weight_based_rate';

function getDefaultCalcType(existing: ExistingRate | null): CalculationType {
  if (existing && existing.cost !== null) return 'flat_rate';
  // For phase 6 we don't have a way to read price_based_cost / weight_based_cost
  // through the dialog (the GraphQL field on the rate doesn't expose them yet
  // in the MethodsList query). Defaults to flat_rate for new rows; tier types
  // are detectable via the existing.cost being null in a later iteration.
  return 'flat_rate';
}

function CostFields({ existing }: { existing: ExistingRate | null }) {
  const { watch } = useFormContext();
  const calcType = watch(
    'calculation_type',
    getDefaultCalcType(existing)
  ) as CalculationType;

  return (
    <>
      {calcType === 'flat_rate' && (
        <NumberField
          name="cost"
          label={_('Cost')}
          placeholder={_('e.g., 10.00')}
          required
          validation={{ required: _('Cost is required') }}
          defaultValue={existing?.cost?.value ?? 0}
          helperText={_('Flat rate in cart currency, tax-exclusive.')}
        />
      )}
      {calcType === 'price_based_rate' && <PriceBasedPrice lines={[]} />}
      {calcType === 'weight_based_rate' && <WeightBasedPrice lines={[]} />}
    </>
  );
}

function ConditionFields({ existing }: { existing: ExistingRate | null }) {
  const { watch } = useFormContext();
  const hasCondition = !!watch('has_condition', !!existing?.conditionType);
  const conditionType = watch(
    'condition_type',
    (existing?.conditionType as 'price' | 'weight') ?? 'price'
  );

  return (
    <div className="space-y-2 pt-2">
      <ToggleField
        name="has_condition"
        label={_('Apply a condition?')}
        defaultValue={!!existing?.conditionType}
      />
      {hasCondition && (
        <>
          <RadioGroupField
            name="condition_type"
            options={[
              { value: 'price', label: _('Based on cart subtotal') },
              { value: 'weight', label: _('Based on cart weight') }
            ]}
            defaultValue={existing?.conditionType ?? 'price'}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              name="min"
              label={_('Min ${unit}', {
                unit:
                  conditionType === 'price' ? _('subtotal') : _('weight')
              })}
              defaultValue={existing?.min ?? 0}
              required
              validation={{ required: _('Min is required') }}
            />
            <NumberField
              name="max"
              label={_('Max ${unit}', {
                unit:
                  conditionType === 'price' ? _('subtotal') : _('weight')
              })}
              defaultValue={existing?.max ?? 0}
              required
              validation={{ required: _('Max is required') }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {_(
              "Half-open interval — a cart at exactly Max is excluded (the next tier's Min owns that point)."
            )}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Rate editor for a Core method in a zone. Two modes:
 *   - create (existing == null): renders a zone picker and POSTs to `createApi`
 *     with the method + zone in the body.
 *   - edit (existing != null): PATCHes the rate's own `updateApi`; the Remove
 *     button DELETEs its `deleteApi`.
 *
 * Reuses WeightBasedPrice / PriceBasedPrice tier editors from the legacy
 * shippingSetting page until phase 8 cleanup.
 */
export function RatePanel({
  existing,
  createApi,
  methodUuid,
  availableZones,
  onSaved
}: RatePanelProps) {
  const form = useForm({ shouldUnregister: true });

  const remove = async () => {
    if (!existing) return;
    try {
      await axios.delete(existing.deleteApi);
      toast.success(_('Rate removed'));
      onSaved();
    } catch (e) {
      toast.error(_('Failed to remove rate'));
    }
  };

  const save = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();
    const calcType = values.calculation_type ?? getDefaultCalcType(existing);

    const body: Record<string, unknown> = {
      is_enabled: values.is_enabled ?? true
    };

    // Calculation
    if (calcType === 'flat_rate') {
      body.cost = String(values.cost ?? 0);
      body.price_based_cost = null;
      body.weight_based_cost = null;
    } else if (calcType === 'price_based_rate') {
      body.cost = null;
      body.weight_based_cost = null;
      body.price_based_cost = values.price_based_cost ?? [];
    } else if (calcType === 'weight_based_rate') {
      body.cost = null;
      body.price_based_cost = null;
      body.weight_based_cost = values.weight_based_cost ?? [];
    }

    // Condition (optional)
    if (values.has_condition) {
      body.condition_type = values.condition_type ?? 'price';
      body.min = String(values.min ?? 0);
      body.max = String(values.max ?? 0);
    } else {
      body.condition_type = null;
      body.min = null;
      body.max = null;
    }

    try {
      if (existing) {
        await axios.patch(existing.updateApi, body);
        toast.success(_('Rate updated'));
      } else {
        await axios.post(createApi, {
          method_id: methodUuid,
          zone_id: values.zone_id,
          ...body
        });
        toast.success(_('Rate added'));
      }
      onSaved();
    } catch (e) {
      toast.error(_('Failed to save rate'));
    }
  };

  return (
    <Form
      id="coreRateForm"
      method={existing ? 'PATCH' : 'POST'}
      action={existing ? existing.updateApi : createApi}
      form={form}
      submitBtn={false}
      onSuccess={() => {}}
    >
      <div className="space-y-3">
        {!existing && (
          <SelectField
            name="zone_id"
            label={_('Zone')}
            options={availableZones.map((z) => ({
              value: z.uuid,
              label: z.name
            }))}
            defaultValue={availableZones[0]?.uuid ?? ''}
            required
            validation={{ required: _('Zone is required') }}
            helperText={_('The zone this rate applies to.')}
          />
        )}

        <ToggleField
          name="is_enabled"
          label={_('Rate status')}
          trueLabel={_('Enabled')}
          falseLabel={_('Disabled')}
          defaultValue={existing?.isEnabled ?? true}
        />

        <RadioGroupField
          name="calculation_type"
          label={_('Calculation type')}
          options={[
            { value: 'flat_rate', label: _('Flat rate') },
            { value: 'price_based_rate', label: _('Price-based tiers') },
            { value: 'weight_based_rate', label: _('Weight-based tiers') }
          ]}
          defaultValue={getDefaultCalcType(existing)}
        />

        <CostFields existing={existing} />
        <ConditionFields existing={existing} />

        <div className="flex justify-between pt-3 border-t border-border">
          {existing ? (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="destructive">
                  {_('Remove rate')}
                </Button>
              }
              title={_('Remove this rate?')}
              description={_('The method will no longer apply to this zone.')}
              confirmLabel={_('Remove rate')}
              confirmVariant="destructive"
              onConfirm={remove}
            />
          ) : (
            <span />
          )}
          <Button type="button" variant="default" onClick={save}>
            {existing ? _('Save rate') : _('Add rate')}
          </Button>
        </div>
      </div>
    </Form>
  );
}
