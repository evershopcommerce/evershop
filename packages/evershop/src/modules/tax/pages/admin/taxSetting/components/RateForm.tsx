import Spinner from '@components/admin/Spinner.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'urql';
import { TaxRate } from './Rate.js';

// Region keys for the country typed into the form, for the helper list, and
// the retired-key warnings of the rate being edited (spec § 3.3, D-23).
const RegionsQuery = `
  query TaxRateRegions($country: String!) {
    regions(country: $country) {
      key
      name
    }
  }
`;

const WarningsQuery = `
  query TaxRateWarnings {
    addressConfigWarnings {
      kind
      source
      sourceId
      key
      keyName
      mergedInto {
        key
        name
      }
    }
  }
`;

/** Collapsible "key — name" list of a country's regions, so the free-text field can be filled without guessing keys. */
function RegionKeyHints({ country }: { country: string }) {
  const valid = /^[A-Z]{2}$/.test(country);
  const [{ data, fetching }] = useQuery({
    query: RegionsQuery,
    variables: { country },
    pause: !valid
  });
  const regions: Array<{ key: string; name: string }> = data?.regions ?? [];
  if (!valid || fetching || regions.length === 0) return null;
  return (
    <details className="text-xs text-muted-foreground mt-1">
      <summary className="cursor-pointer">
        {_('Show region keys for ${country}', { country })}
      </summary>
      <ul className="mt-1 max-h-40 overflow-y-auto columns-2 gap-4">
        {regions.map((r) => (
          <li key={r.key}>
            <code>{r.key}</code> — {r.name}
          </li>
        ))}
      </ul>
    </details>
  );
}

interface MethodFormProps {
  saveRateApi: string;
  closeModal: () => void;
  getTaxClasses: (options?: { requestPolicy?: string }) => Promise<void> | void;
  rate?: TaxRate;
}

function RateForm({
  saveRateApi,
  closeModal,
  getTaxClasses,
  rate
}: MethodFormProps) {
  const form = useForm({
    shouldUnregister: true
  });
  const [saving, setSaving] = React.useState(false);
  const [warningsResult] = useQuery({ query: WarningsQuery, pause: !rate });
  const retiredKeys: Array<{ key: string; keyName?: string | null }> = (
    warningsResult.data?.addressConfigWarnings ?? []
  ).filter(
    (w: { kind: string; source: string; sourceId: string }) =>
      w.kind === 'RETIRED_REGION' &&
      w.source === 'tax_rate' &&
      w.sourceId === rate?.uuid
  );
  const watchedCountry = String(
    form.watch('country', rate?.country ?? '') ?? ''
  )
    .trim()
    .toUpperCase();

  if (warningsResult.fetching) {
    return (
      <div className="flex justify-center p-2">
        <Spinner width={25} height={25} />
      </div>
    );
  }

  return (
    <Form
      form={form}
      id="taxRateForm"
      method={rate ? 'PATCH' : 'POST'}
      action={saveRateApi}
      submitBtn={false}
      onError={(error: string) => {
        toast.error(error);
        setSaving(false);
      }}
      onSuccess={async (response) => {
        if (!response.error) {
          await getTaxClasses({ requestPolicy: 'network-only' });
          closeModal();
          toast.success(_('Tax rate has been saved successfully!'));
        } else {
        }
        setSaving(false);
      }}
    >
      <div className="py-3 border-t border-border">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <InputField
              name="name"
              placeholder={_('Name')}
              required
              validation={{ required: _('Name is required') }}
              label={_('Name')}
              defaultValue={rate?.name}
            />
          </div>
          <div>
            <NumberField
              name="rate"
              label={_('Rate')}
              placeholder={_('Rate')}
              required
              validation={{ required: _('Rate is required') }}
              defaultValue={rate?.rate}
            />
          </div>
        </div>
      </div>
      <div className="py-3 border-t border-border">
        <div className="grid grid-cols-3 gap-5">
          <div>
            <InputField
              name="country"
              label={_('Country')}
              placeholder={_('Country')}
              required
              validation={{ required: _('Country is required') }}
              defaultValue={rate?.country}
              helperText={_(
                'Country code (e.g., "US"). Use "*" for all countries.'
              )}
            />
          </div>
          <div>
            <InputField
              name="administrative_area"
              label={_('Regions')}
              placeholder="*"
              required
              validation={{ required: _('Regions is required') }}
              defaultValue={rate?.administrativeArea}
              helperText={_(
                'Region keys (e.g., "US-CA"), comma-separated. Use "*" for all regions.'
              )}
            />
            <RegionKeyHints country={watchedCountry} />
            {retiredKeys.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {_('Retired region keys on this rate: ${keys}', {
                  keys: retiredKeys
                    .map((w) => (w.keyName ? `${w.key} (${w.keyName})` : w.key))
                    .join(', ')
                })}
              </p>
            )}
          </div>
          <div>
            <InputField
              name="postal_code"
              label={_('Postal code')}
              placeholder="*"
              required
              validation={{ required: _('Postal code is required') }}
              defaultValue={rate?.postalCode}
              helperText={_(
                'Postal codes (e.g., "90210"), comma-separated. Use "*" for all postal codes.'
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 mt-5">
          <div>
            <ToggleField
              name="is_compound"
              label={_('Is compound')}
              defaultValue={rate?.isCompound || false}
            />
          </div>
          <div />
        </div>
        <div className="grid grid-cols-2 gap-5 mt-5">
          <div>
            <NumberField
              name="priority"
              label={_('Priority')}
              placeholder={_('Priority')}
              validation={{ required: _('Priority is required') }}
              required
              defaultValue={rate?.priority}
            />
          </div>
          <div />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button title={_('Cancel')} variant="secondary" onClick={closeModal}>
          {_('Cancel')}
        </Button>
        <Button
          title={_('Save')}
          variant="default"
          onClick={async () => {
            const result = await form.trigger();
            if (!result) {
              return;
            }
            setSaving(true);
            (
              document.getElementById('taxRateForm') as HTMLFormElement
            ).dispatchEvent(
              new Event('submit', {
                cancelable: true,
                bubbles: true
              })
            );
          }}
          isLoading={saving}
        >
          {_('Save')}
        </Button>
      </div>
    </Form>
  );
}

export { RateForm };
