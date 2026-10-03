import {
  Controller,
  Form,
  useFormContext
} from '@components/common/form/Form.js';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@components/common/ui/Alert.js';
import { Button } from '@components/common/ui/Button.js';
import { ConfirmDialog } from '@components/common/ui/ConfirmDialog.js';
import { Field, FieldLabel } from '@components/common/ui/Field.js';
import { toast } from '@components/common/ui/Sonner.js';
import { Switch } from '@components/common/ui/Switch.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import ReactSelect from 'react-select';

/**
 * "Sell to countries" (Address Format Registry § 3.13), placed above the
 * shipping zones because that is what it interacts with: the address book
 * and billing offer the list, the shipping address offers the list ∩ zone
 * countries, and a zone covering a country outside the list is kept and
 * flagged, never deleted. The card is its own small form posting the one
 * `addressSellToCountries` row (`'all'` or a code list) through the generic
 * `saveSetting` upsert; narrowing the list names the zones it strands and
 * asks before saving, and the zones list reloads afterwards so its badges
 * and the store-wide notice follow.
 */
export interface SellToCountryOption {
  code: string;
  name: string;
}

export interface SellToZone {
  uuid: string;
  name: string;
  countries: SellToCountryOption[];
}

export type SellToValue = 'all' | string[];

const FORM_ID = 'sellToCountries';

/** Zones that would stop serving a country if `sellTo` became the list. */
export function strandedZones(
  zones: SellToZone[],
  sellTo: SellToValue | undefined
): { zone: SellToZone; countries: SellToCountryOption[] }[] {
  if (!Array.isArray(sellTo)) {
    return [];
  }
  const allowed = new Set(sellTo.map((c) => c.toUpperCase()));
  return zones
    .map((zone) => ({
      zone,
      countries: zone.countries.filter(
        (c) => !allowed.has(c.code.toUpperCase())
      )
    }))
    .filter((entry) => entry.countries.length > 0);
}

export function strandedSummary(
  entries: { zone: SellToZone; countries: SellToCountryOption[] }[]
): string {
  return entries
    .map((e) => `${e.countries.map((c) => c.name).join(', ')} (${e.zone.name})`)
    .join('; ');
}

/**
 * One Controller holding `'all'` or a code list, so the form posts exactly
 * what the setting stores. The switch and the multi-select are its two views.
 */
function SellToCountriesField({
  countries,
  initial
}: {
  countries: SellToCountryOption[];
  initial: SellToValue;
}) {
  const { control } = useFormContext();
  const options = countries.map((c) => ({ value: c.code, label: c.name }));
  return (
    <Controller
      name="addressSellToCountries"
      control={control}
      defaultValue={initial}
      render={({ field }) => {
        const all = !Array.isArray(field.value);
        const selected = Array.isArray(field.value)
          ? (field.value as string[])
          : [];
        return (
          <Field data-slot="field" className="gap-2">
            <FieldLabel>{_('Sell to countries')}</FieldLabel>
            <div className="flex items-center gap-3">
              <Switch
                id="addressSellToAll"
                aria-labelledby="addressSellToAll-label"
                checked={all}
                onCheckedChange={(checked: boolean) =>
                  field.onChange(checked ? 'all' : selected)
                }
              />
              <label
                id="addressSellToAll-label"
                htmlFor="addressSellToAll"
                className="text-sm"
              >
                {_('All countries')}
              </label>
            </div>
            {!all && (
              <ReactSelect
                inputId="addressSellToCountries"
                isMulti
                options={options}
                value={options.filter((o) => selected.includes(o.value))}
                onChange={(picked) =>
                  field.onChange(
                    (picked ?? []).map((o) => (o as { value: string }).value)
                  )
                }
                placeholder={_('Select countries')}
                classNamePrefix="react-select"
              />
            )}
            <p className="text-muted-foreground text-xs">
              {_(
                'Only these countries are offered in the address book and at checkout. Shipping also needs a zone that covers the country.'
              )}
            </p>
          </Field>
        );
      }}
    />
  );
}

/** Save: plain submit, or a confirmation naming the stranded zones when the watched list strands one. */
function SaveSellTo({
  zones,
  initial
}: {
  zones: SellToZone[];
  initial: SellToValue;
}) {
  const { watch } = useFormContext();
  const sellTo = watch('addressSellToCountries') as SellToValue | undefined;
  const stranded = strandedZones(zones, sellTo ?? initial);
  const summary = strandedSummary(stranded);
  const submit = () => {
    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    form?.requestSubmit();
  };
  return (
    <>
      {stranded.length > 0 && (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>
            {_('These zones will stop serving: ${zones}', { zones: summary })}
          </AlertTitle>
          <AlertDescription>
            {_(
              'The zones are kept and flagged, nothing is deleted. Checkout will not offer these countries.'
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="mt-3 flex justify-end">
        {stranded.length > 0 ? (
          <ConfirmDialog
            trigger={
              <Button type="button" size="sm">
                {_('Save Settings')}
              </Button>
            }
            title={_('Narrow the countries you sell to?')}
            description={_('These zones will stop serving: ${zones}', {
              zones: summary
            })}
            confirmLabel={_('Save anyway')}
            confirmVariant="destructive"
            onConfirm={submit}
          />
        ) : (
          <Button type="submit" size="sm" form={FORM_ID}>
            {_('Save Settings')}
          </Button>
        )}
      </div>
    </>
  );
}

export function SellToCountriesCard({
  zones,
  countries,
  sellTo,
  saveSettingApi,
  onSaved
}: {
  zones: SellToZone[];
  countries: SellToCountryOption[];
  sellTo: SellToValue;
  saveSettingApi: string;
  onSaved?: () => void;
}) {
  return (
    <div className="mx-5 mb-5 rounded-lg border border-border p-4">
      <Form
        method="POST"
        id={FORM_ID}
        action={saveSettingApi}
        submitBtn={false}
        onSuccess={() => {
          toast.success(_('Saved successfully!'));
          onSaved?.();
        }}
      >
        <SellToCountriesField countries={countries} initial={sellTo} />
        <SaveSellTo zones={zones} initial={sellTo} />
      </Form>
    </div>
  );
}
