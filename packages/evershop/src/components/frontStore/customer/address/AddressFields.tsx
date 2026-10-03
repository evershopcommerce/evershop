import Area from '@components/common/Area.js';
import type {
  AddressSurface,
  ResolvedAddressField,
  ResolvedAddressSchema
} from '@evershop/evershop/lib/address/types';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch, type RegisterOptions } from 'react-hook-form';
import {
  countrySwapPlan,
  fieldName,
  normalizeTelephoneInput,
  parentChain,
  previewLines,
  rowsOf
} from './addressFormLogic.js';
import { addressFieldLabel, addressMessage } from './labelTypes.js';
import { MasterField } from './MasterField.js';
import { useRegions } from './useRegions.js';

/**
 * The default address renderer (spec § 3.9): rows from `row`, the country
 * first, react-hook-form rules from `required` and `pattern`, enumerated
 * levels as lazy region selects with the `dependsOn` cascade, explicit
 * clearing on a country swap, the retired-key marker, and a live preview
 * through the same `formatAddress` the server uses. Each field sits in its
 * own Area (`addressField.<id>`); the whole block sits in
 * `addressForm.<surface>`. `AddressRendererProps` is public API: a theme that
 * wants another layout ships its own renderer over the same props.
 */
export interface AddressRendererProps {
  schema: ResolvedAddressSchema;
  /** Form field-name prefix: '', 'shippingAddress', 'billingAddress'. */
  namePrefix: string;
  /** 'account' | 'shipping' | 'billing' — also the Area id suffix. */
  surface: AddressSurface;
  /** Country options for the select, from `countries(scope:)`. */
  countries: { value: string; label: string }[];
  /** Initial values by field id (a stored address); absent on a new address. */
  initialValues?: Record<string, string>;
  /** Called with the ISO code when the customer changes the country. */
  onCountryChange?: (country: string) => void;
}

type OptionLabels = Record<string, Record<string, string>>;

function text(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

/**
 * react-hook-form rules from the schema: `required` and the anchored
 * `pattern`. Every key is ALWAYS present (`false` / `undefined` when unused):
 * a field kept across a country swap re-registers with the new rules, and
 * react-hook-form merges them over the old ones — a key that is merely absent
 * leaves the previous country's rule in place (the default schema's required
 * City followed the form into Vietnam, where City is optional).
 */
export function rulesFor(field: ResolvedAddressField, label: string): RegisterOptions {
  const rules: RegisterOptions = {
    required: field.required ? addressMessage('${field} is required', { field: label }) : false,
    pattern: undefined,
    validate: undefined
  };
  if (field.pattern) {
    const regex = new RegExp(field.pattern.regex);
    const message = addressMessage(field.pattern.messageKey, { field: label });
    if (field.type === 'tel') {
      // The server normalizes a telephone (separators out, 00 → +) before it
      // applies the pattern; test the same form here, or "0912 345 678" fails
      // in the browser and passes on the server.
      rules.validate = (value: unknown) =>
        value === undefined || value === null || String(value).trim() === ''
          ? true
          : regex.test(normalizeTelephoneInput(value)) || message;
    } else {
      rules.pattern = { value: regex, message };
    }
  }
  return rules;
}

/**
 * One 12-column grid for the whole form, fields in row order with a span per
 * row width — never a wrapper per row. A field keyed by its id then keeps its
 * DOM node (and its react-hook-form registration) when a country swap moves
 * it to another row; a wrapper per row would remount it, and under
 * `shouldUnregister: true` a remount drops the value. Tailwind needs literal
 * class names; rows hold at most four fields.
 */
const SPAN_BY_ROW_WIDTH: Record<number, string> = {
  1: 'col-span-12',
  2: 'col-span-12 sm:col-span-6',
  3: 'col-span-12 sm:col-span-4',
  4: 'col-span-12 sm:col-span-3'
};

/** An enumerated level: options from `regions(country, parentPath)`, disabled until its parent is set, cleared when the parent changes. */
function RegionSelect({
  field,
  schema,
  namePrefix,
  initialValue,
  onOptions
}: {
  field: ResolvedAddressField;
  schema: ResolvedAddressSchema;
  namePrefix: string;
  initialValue?: string;
  onOptions: (id: string, labels: Record<string, string>) => void;
}) {
  const { control, setValue } = useFormContext();
  const name = fieldName(namePrefix, field.id);
  const parents = parentChain(schema, field);
  const parentNames = parents.map((parent) => fieldName(namePrefix, parent.id));
  const watchedParents = useWatch({ control, name: parentNames }) as unknown[];
  const parentPath = parents.map((_parent, index) => text(watchedParents?.[index]).trim());
  const waitingForParent = parents.length > 0 && parentPath.some((key) => key === '');
  const { regions, fetching } = useRegions(schema.country, parentPath, waitingForParent);
  // Before the select registers (first render, SSR) the watch is undefined;
  // the stored value is what the marker rule has to judge then.
  const watched = useWatch({ control, name }) as unknown;
  const current = text(watched === undefined ? initialValue : watched).trim();
  const label = addressFieldLabel(field);

  const options = regions.map((region) => ({ value: region.key, label: region.name }));
  // A stored key the provider no longer lists (retired by a data refresh):
  // keep it visible, marked, so the customer sees what was there and picks
  // again. The server rejects it on save (`region_invalid`).
  if (current !== '' && !fetching && regions.length > 0 && !regions.some((r) => r.key === current)) {
    options.unshift({ value: current, label: `${current} — ${_('no longer available')}` });
  }

  const regionsKey = regions.map((r) => `${r.key}=${r.name}`).join('|');
  useEffect(() => {
    onOptions(field.id, Object.fromEntries(regions.map((r) => [r.key, r.name])));
  }, [regionsKey]);

  // The `dependsOn` cascade: when a parent changes, this level clears.
  const parentKey = parentPath.join('|');
  const previousParentKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousParentKey.current !== undefined && previousParentKey.current !== parentKey) {
      setValue(name, '', { shouldDirty: true, shouldValidate: false });
    }
    previousParentKey.current = parentKey;
  }, [parentKey]);

  return (
    <MasterField
      field={field}
      name={name}
      label={label}
      required={field.required}
      rules={rulesFor(field, label)}
      defaultValue={initialValue ?? ''}
      options={options}
      disabled={waitingForParent || fetching}
      placeholder={fetching ? _('Loading...') : _('Select ${field}', { field: label })}
    />
  );
}

function AddressPreview({
  schema,
  namePrefix,
  optionLabels
}: {
  schema: ResolvedAddressSchema;
  namePrefix: string;
  optionLabels: OptionLabels;
}) {
  const { control } = useFormContext();
  const all = useWatch({ control }) as Record<string, unknown> | undefined;
  const values = (namePrefix ? (all?.[namePrefix] as Record<string, unknown> | undefined) : all) ?? {};
  const lines = previewLines(schema, values, optionLabels);
  if (lines.length < 2) {
    return null;
  }
  return (
    <div
      className="address-preview mt-3 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground"
      aria-live="polite"
    >
      {lines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  );
}

function AddressRows({
  schema,
  namePrefix,
  countries,
  initialValues = {},
  onCountryChange,
  onOptions
}: AddressRendererProps & { onOptions: (id: string, labels: Record<string, string>) => void }) {
  const { setValue, unregister, clearErrors } = useFormContext();

  // Country swap (spec § 3.9): clear what changed shape or vanished, keep the rest.
  const previousSchema = useRef<ResolvedAddressSchema | undefined>(undefined);
  useEffect(() => {
    const previous = previousSchema.current;
    if (previous && previous.country !== schema.country) {
      const plan = countrySwapPlan(previous, schema);
      for (const id of plan.remove) {
        unregister(fieldName(namePrefix, id));
      }
      for (const id of plan.clear) {
        const name = fieldName(namePrefix, id);
        setValue(name, '', { shouldDirty: true, shouldValidate: false });
        clearErrors(name);
      }
    }
    previousSchema.current = schema;
  }, [schema]);

  const countryDefault = initialValues.country || schema.country || '';

  return (
    <div className="address-fields__grid grid grid-cols-12 gap-3">
      {rowsOf(schema).map((row) =>
        row.map((field) => {
          const name = fieldName(namePrefix, field.id);
          const label = addressFieldLabel(field);
          const span = SPAN_BY_ROW_WIDTH[Math.min(row.length, 4)];
          let control: React.ReactNode;
          if (field.id === 'country') {
            // One country offered (sell-to list of one, or a single zone
            // country for shipping): nothing to choose, so the field is a
            // read-only line with that value — not hidden, the customer still
            // sees where the address is for.
            const fixed = countries.length === 1 ? countries[0].value : undefined;
            control = (
              <MasterField
                field={field}
                name={name}
                label={label}
                required
                rules={rulesFor(field, label)}
                defaultValue={fixed ?? countryDefault}
                options={countries}
                readOnly={fixed !== undefined}
                placeholder={_('Select ${field}', { field: label })}
                onChange={(value) => onCountryChange?.(String(value))}
              />
            );
          } else if (field.optionSource === 'regions') {
            control = (
              <RegionSelect
                field={field}
                schema={schema}
                namePrefix={namePrefix}
                initialValue={initialValues[field.id]}
                onOptions={onOptions}
              />
            );
          } else {
            control = (
              <MasterField
                field={field}
                name={name}
                label={label}
                required={field.required}
                rules={rulesFor(field, label)}
                defaultValue={initialValues[field.id] ?? ''}
                placeholder={field.placeholder ?? label}
              />
            );
          }
          return (
            <div key={field.id} className={`address-fields__field ${span}`} data-row={field.row} data-field={field.id}>
              {control}
            </div>
          );
        })
      )}
    </div>
  );
}

export function AddressFields(props: AddressRendererProps) {
  const [optionLabels, setOptionLabels] = useState<OptionLabels>({});
  const onOptions = useCallback((id: string, labels: Record<string, string>) => {
    setOptionLabels((current) => ({ ...current, [id]: labels }));
  }, []);
  // Country names for the preview come from the country options themselves.
  const countryLabels = Object.fromEntries(props.countries.map((c) => [c.value, c.label]));
  const labels: OptionLabels = { ...optionLabels, country: countryLabels };

  return (
    <Area
      id={`addressForm.${props.surface}`}
      className="address-fields"
      coreComponents={[
        {
          id: 'addressFields',
          component: { default: AddressRows },
          props: { ...props, onOptions },
          sortOrder: 10
        },
        {
          id: 'addressPreview',
          component: { default: AddressPreview },
          props: { schema: props.schema, namePrefix: props.namePrefix, optionLabels: labels },
          sortOrder: 20
        }
      ]}
    />
  );
}

export default AddressFields;
