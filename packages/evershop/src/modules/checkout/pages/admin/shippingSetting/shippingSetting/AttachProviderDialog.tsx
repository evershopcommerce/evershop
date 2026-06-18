import Spinner from '@components/admin/Spinner.jsx';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';
import type { RegisterOptions } from 'react-hook-form';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import type { ShippingZone } from './Zone.js';

const ProvidersQuery = `
  query AttachableProviders {
    shippingProviders {
      code
      name
      description
      zoneConfigFields
    }
  }
`;

/** Mirrors core's `ZoneConfigField` (types/shippingProvider.ts) — the
 *  provider-declared, purpose-built field list (NOT JSON Schema). */
export interface ZoneConfigFieldDef {
  name: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'toggle';
  label: string;
  placeholder?: string;
  description?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ value: string | number; label: string }>;
  trueLabel?: string;
  falseLabel?: string;
  validation?: {
    required?: string;
    min?: { value: number; message: string };
    max?: { value: number; message: string };
    pattern?: { value: string; message: string };
  };
}

interface ProviderRow {
  code: string;
  name: string;
  description?: string | null;
  zoneConfigFields: ZoneConfigFieldDef[] | null;
}

interface AttachProviderDialogProps {
  zone: ShippingZone;
  alreadyAttached: string[];
  onSaved: () => void;
}

/**
 * Attach a provider to a zone. Renders the provider's `zoneConfigFields`
 * with EverShop's built-in form fields (validation included). For providers
 * with no fields (e.g., Core), shows an informational note instead.
 *
 * The "configure existing attachment" flow is symmetric — phase 8 (or a
 * polish pass) can extract a reusable EditAttachmentDialog. For phase 7 the
 * Detach button is sufficient.
 */
export function AttachProviderDialog({
  zone,
  alreadyAttached,
  onSaved
}: AttachProviderDialogProps) {
  const form = useForm({ defaultValues: { provider_code: '', config: {} } });
  const [{ data, fetching, error }] = useQuery({
    query: ProvidersQuery,
    requestPolicy: 'network-only'
  });

  if (fetching) return <Spinner width={20} height={20} />;
  if (error)
    return (
      <div className="text-destructive">{_('Error loading providers')}</div>
    );
  if (!data) return null;

  // Registry-only model: installed = enabled, so the only condition to
  // exclude a provider is "already attached to this zone". The old
  // `p.isEnabled` gate read a field that no longer exists on the
  // ShippingProvider GraphQL type — silently filtered every provider out
  // and surfaced the misleading "all already attached" empty state.
  const availableProviders: ProviderRow[] = (
    data.shippingProviders ?? []
  ).filter((p: ProviderRow) => !alreadyAttached.includes(p.code));

  if (availableProviders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {_('All registered providers are already attached to this zone.')}
      </p>
    );
  }

  return (
    <FormProvider {...form}>
      <AttachForm
        zone={zone}
        availableProviders={availableProviders}
        onSaved={onSaved}
      />
    </FormProvider>
  );
}

function AttachForm({
  zone,
  availableProviders,
  onSaved
}: {
  zone: ShippingZone;
  availableProviders: ProviderRow[];
  onSaved: () => void;
}) {
  const { watch, register, trigger, getValues, setValue } = useFormContext();
  const selectedCode = watch('provider_code') as string;
  const selected =
    availableProviders.find((p) => p.code === selectedCode) ?? null;

  const attach = async () => {
    if (!selected) {
      toast.error(_('Select a provider first'));
      return;
    }
    const valid = await trigger();
    if (!valid) return;
    const values = getValues();
    try {
      await axios.post(`/api/shippingZones/${zone.uuid}/providers`, {
        provider_code: selected.code,
        config: values.config ?? {}
      });
      toast.success(
        _('${name} attached to ${zone}', {
          name: selected.name,
          zone: zone.name
        })
      );
      onSaved();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? _('Failed to attach provider');
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">
          {_('Provider')}
        </label>
        <select
          className="w-full border border-border rounded px-2 py-1"
          value={selectedCode || ''}
          onChange={(e) => {
            setValue('provider_code', e.target.value);
            setValue('config', {});
          }}
        >
          <option value="">{_('Select a provider…')}</option>
          {availableProviders.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        <input type="hidden" {...register('provider_code')} />
      </div>

      {selected && (
        <div className="border-t pt-3 space-y-3 border-border">
          <div>
            <h3 className="font-semibold">
              {_('${name} configuration for this zone', {
                name: selected.name
              })}
            </h3>
            {selected.description && (
              <p className="text-xs text-muted-foreground">
                {selected.description}
              </p>
            )}
          </div>
          <ZoneConfigFields fields={selected.zoneConfigFields} />
        </div>
      )}

      <div className="flex justify-end pt-3">
        <Button type="button" variant="default" onClick={attach}>
          {_('Attach')}
        </Button>
      </div>
    </div>
  );
}

export function ZoneConfigFields({
  fields,
  values
}: {
  fields: ZoneConfigFieldDef[] | null;
  /** Current config values — prefill for the edit-config dialog. */
  values?: Record<string, unknown>;
}) {
  if (!fields || fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {_(
          "This provider has no per-zone configuration. Methods and per-zone rates are managed in the provider's own admin area."
        )}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {fields.map((field) => {
        // Translate the JSON-serializable rules into react-hook-form rules
        // (pattern travels as a regex SOURCE string — compile it here).
        const validation: RegisterOptions = {};
        if (field.validation?.required) {
          validation.required = field.validation.required;
        }
        if (field.validation?.min) {
          validation.min = field.validation.min;
        }
        if (field.validation?.max) {
          validation.max = field.validation.max;
        }
        if (field.validation?.pattern) {
          validation.pattern = {
            value: new RegExp(field.validation.pattern.value),
            message: field.validation.pattern.message
          };
        }
        const current = values?.[field.name];
        const initial =
          current !== undefined && current !== null && current !== ''
            ? current
            : field.defaultValue;
        const common = {
          name: `config.${field.name}`,
          label: field.label,
          required: Boolean(field.validation?.required),
          validation,
          helperText: field.description
        };
        if (field.type === 'number') {
          return (
            <NumberField
              key={field.name}
              {...common}
              placeholder={field.placeholder}
              defaultValue={
                initial === undefined || initial === null || initial === ''
                  ? undefined
                  : Number(initial)
              }
            />
          );
        }
        if (field.type === 'toggle') {
          return (
            <ToggleField
              key={field.name}
              {...common}
              defaultValue={Boolean(initial)}
              trueValue={true}
              falseValue={false}
              trueLabel={field.trueLabel}
              falseLabel={field.falseLabel}
            />
          );
        }
        if (field.type === 'select') {
          return (
            <SelectField
              key={field.name}
              {...common}
              options={field.options ?? []}
              placeholder={field.placeholder}
              defaultValue={
                initial === undefined || initial === null || initial === ''
                  ? undefined
                  : (initial as string | number)
              }
            />
          );
        }
        if (field.type === 'textarea') {
          return (
            <TextareaField
              key={field.name}
              {...common}
              placeholder={field.placeholder}
              defaultValue={
                initial === undefined || initial === null ? '' : String(initial)
              }
            />
          );
        }
        return (
          <InputField
            key={field.name}
            {...common}
            placeholder={field.placeholder}
            defaultValue={
              initial === undefined || initial === null ? '' : String(initial)
            }
          />
        );
      })}
    </div>
  );
}
