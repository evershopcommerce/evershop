import Spinner from '@components/admin/Spinner.jsx';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { ReactSelectField } from '@components/common/form/ReactSelectField.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';
import type { ShippingZone } from './Zone.js';

export interface ZoneFormProps {
  formMethod?: 'POST' | 'PATCH';
  saveZoneApi: string;
  onSuccess: () => void;
  reload: () => void;
  zone?: ShippingZone;
}

const CountriesQuery = `
  query Country {
    countries {
      value: code
      label: name
      provinces {
        value: code
        label: name
      }
    }
  }
`;

interface CountryOption {
  value: string;
  label: string;
  provinces: Array<{ value: string; label: string }>;
}

/**
 * Zone create/edit form with multi-country support.
 *
 * Form state:
 *   - name: string
 *   - countries: string[]                (ISO codes)
 *   - provincesByCountry: { [cc]: string[] }  (province codes per country)
 *
 * On submit, transforms to the new API shape:
 *   { name, countries, provinces: [{ country, province }] }
 *
 * Submits via axios directly to avoid the Form component's auto-handling of
 * complex nested fields; we want explicit control over the payload shape.
 */
export function ZoneForm({
  formMethod,
  saveZoneApi,
  onSuccess,
  reload,
  zone
}: ZoneFormProps) {
  // Build initial state from the zone prop (edit mode) or empty (create).
  const initialCountries =
    zone?.countries?.map((c) => c.code).filter(Boolean) ?? [];
  const initialProvincesByCountry: Record<string, string[]> = {};
  (zone?.provinces ?? []).forEach((p) => {
    const cc = p.countryCode;
    if (!cc) return;
    if (!initialProvincesByCountry[cc]) initialProvincesByCountry[cc] = [];
    initialProvincesByCountry[cc].push(p.code);
  });

  const form = useForm({
    defaultValues: {
      name: zone?.name ?? '',
      countries: initialCountries
    }
  });

  const [provincesByCountry, setProvincesByCountry] = React.useState<
    Record<string, string[]>
  >(initialProvincesByCountry);

  const selectedCountries = (form.watch('countries') ?? []) as string[];

  // When countries change, drop province entries for unselected countries.
  // MUST be declared before the early returns below — rules of hooks.
  const selectedKey = selectedCountries.join(',');
  React.useEffect(() => {
    setProvincesByCountry((prev) => {
      const next: Record<string, string[]> = {};
      for (const cc of selectedCountries) {
        if (prev[cc]) next[cc] = prev[cc];
      }
      return next;
    });
  }, [selectedKey]);

  const [{ data, fetching, error }] = useQuery({ query: CountriesQuery });

  if (fetching) return <Spinner width={20} height={20} />;
  if (error)
    return <p className="text-destructive">{_('Error loading countries')}</p>;
  if (!data) return null;

  const countriesByCode = new Map<string, CountryOption>(
    (data.countries ?? []).map((c: CountryOption) => [c.value, c])
  );

  const onSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const name = form.getValues('name');
    const countries = (form.getValues('countries') ?? []) as string[];

    const provinces: Array<{ country: string; province: string }> = [];
    for (const cc of countries) {
      const list = provincesByCountry[cc] ?? [];
      for (const province of list) {
        provinces.push({ country: cc, province });
      }
    }

    try {
      const config = {
        method: formMethod ?? 'POST',
        url: saveZoneApi,
        data: { name, countries, provinces }
      };
      await axios.request(config);
      toast.success(zone ? _('Zone updated') : _('Zone created'));
      reload();
      onSuccess();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? _('Failed to save zone');
      toast.error(msg);
    }
  };

  return (
    <Form
      id="zoneForm"
      method={formMethod ?? 'POST'}
      action={saveZoneApi}
      submitBtn={false}
      onSuccess={() => {
        /* we submit via axios — Form's submit path isn't used */
      }}
      form={form}
    >
      <div className="space-y-3">
        <InputField
          name="name"
          label={_('Zone Name')}
          aria-label={_('Zone Name')}
          placeholder={_('e.g., EU, US-West')}
          required
          validation={{ required: _('Zone name is required') }}
          defaultValue={zone?.name}
        />
        <ReactSelectField
          name="countries"
          label={_('Countries')}
          aria-label={_('Countries')}
          placeholder={_('Select countries')}
          required
          validation={{
            required: _('At least one country is required'),
            validate: (v: unknown) =>
              (Array.isArray(v) && v.length > 0) ||
              _('At least one country is required')
          }}
          options={data.countries}
          hideSelectedOptions
          isMulti
          defaultValue={initialCountries}
        />

        {selectedCountries.length > 0 && (
          <div className="border-t pt-3 border-border">
            <label className="text-sm font-medium">
              {_('Province Restrictions')}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              {_(
                "Leave a country's list empty to cover the whole country. Add provinces to restrict shipping to specific regions."
              )}
            </p>
            <div className="space-y-3">
              {selectedCountries.map((cc: string) => {
                const country = countriesByCode.get(cc);
                if (!country) return null;
                const value = provincesByCountry[cc] ?? [];
                const options = country.provinces ?? [];
                return (
                  <div key={cc} className="border rounded p-3 border-border">
                    <div className="font-medium mb-1">
                      {country.label}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({country.value})
                      </span>
                    </div>
                    {options.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">
                        {_(
                          'No subdivisions available — whole country is covered.'
                        )}
                      </p>
                    ) : (
                      <PerCountryProvinces
                        country={country}
                        value={value}
                        onChange={(next) => {
                          setProvincesByCountry((prev) => ({
                            ...prev,
                            [cc]: next
                          }));
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            title={_('Save')}
            variant="default"
            type="button"
            onClick={onSubmit}
          >
            {_('Save')}
          </Button>
        </div>
      </div>
    </Form>
  );
}

/**
 * Multi-select of provinces for a given country. Uses react-select via a tiny
 * wrapper — kept inline because the parent's form binds the country list
 * but not the per-country provinces (those are managed in local state).
 */
function PerCountryProvinces({
  country,
  value,
  onChange
}: {
  country: CountryOption;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const options = country.provinces;
  return (
    <select
      multiple
      className="w-full border rounded px-2 py-1 text-sm h-32 border-border"
      value={value}
      onChange={(e) => {
        const next = Array.from(e.target.selectedOptions).map((o) => o.value);
        onChange(next);
      }}
    >
      {options.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
