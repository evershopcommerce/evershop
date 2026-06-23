import Spinner from '@components/admin/Spinner.jsx';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { ReactSelectField } from '@components/common/form/ReactSelectField.js';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@components/common/ui/Accordion.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { cn } from '@evershop/evershop/lib/util/cn';
import axios from 'axios';
import React from 'react';
import { useForm } from 'react-hook-form';
import Select, { StylesConfig } from 'react-select';
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
 * Shared react-select props that portal the dropdown menu to <body>. The form
 * scrolls inside a height-capped container and the province accordion clips
 * with overflow-hidden, either of which would otherwise cut the menu off.
 * Fixed positioning keeps it anchored to the control, and z-index 1300 lifts it
 * above the dialog (z-1200). base-ui's modal dialog treats clicks on this
 * post-render injected menu as "inside", so selecting an option won't close the
 * dialog (see floating-ui useDismiss third-party-element handling).
 */
const MENU_PORTAL_PROPS = {
  menuPortalTarget:
    typeof document !== 'undefined' ? document.body : undefined,
  menuPosition: 'fixed' as const,
  styles: {
    menuPortal: (base) => ({ ...base, zIndex: 1300 })
  } as StylesConfig<any, boolean>
};

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
  // Expand the countries that already have province restrictions on mount, so
  // edit mode surfaces existing restrictions without the user hunting for them.
  const defaultOpenCountries = Object.keys(initialProvincesByCountry).filter(
    (cc) => initialProvincesByCountry[cc].length > 0
  );

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
      <div className="flex flex-col">
        {/* Scroll the fields when the form is tall so the dialog never grows
            past the viewport; the Save footer below stays pinned. */}
        <div className="space-y-3 overflow-y-auto pr-1 max-h-[calc(100vh-13rem)]">
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
            {...MENU_PORTAL_PROPS}
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
              <Accordion
                multiple
                defaultValue={defaultOpenCountries}
                className="border rounded border-border divide-y divide-border"
              >
                {selectedCountries.map((cc: string) => {
                  const country = countriesByCode.get(cc);
                  if (!country) return null;
                  const value = provincesByCountry[cc] ?? [];
                  const options = country.provinces ?? [];
                  const summary =
                    options.length === 0 || value.length === 0
                      ? _('Whole country')
                      : _('${count} selected', {
                          count: String(value.length)
                        });
                  return (
                    <AccordionItem key={cc} value={cc} className="px-3">
                      <AccordionTrigger className="py-3">
                        <span className="flex flex-1 items-center justify-between pr-2">
                          <span>
                            <span className="font-medium">
                              {country.label}
                            </span>{' '}
                            <span className="text-xs text-muted-foreground">
                              ({country.value})
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {summary}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
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
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-border">
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
 * Multi-select of provinces for a given country. Uses react-select, styled to
 * match the Countries field — kept inline because the parent's form binds the
 * country list but not the per-country provinces (those are managed in local
 * state, so this stays a plain controlled component rather than a
 * form-bound ReactSelectField).
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
    <Select
      isMulti
      options={options}
      value={options.filter((option) => value.includes(option.value))}
      onChange={(selected) => {
        onChange((selected ?? []).map((option) => option.value));
      }}
      placeholder={_('Select provinces')}
      hideSelectedOptions
      className="text-sm"
      classNamePrefix="react-select"
      {...MENU_PORTAL_PROPS}
      classNames={{
        control: (state) =>
          cn(
            'min-h-auto border border-input rounded-md shadow-xs transition-[color,box-shadow]',
            state.isFocused && 'border-ring ring-[3px] ring-ring/50'
          ),
        input: () => 'outline-none shadow-none',
        menu: () => 'bg-popover border border-input rounded-md shadow-md',
        option: (state) =>
          cn(
            'px-3 py-2 cursor-pointer',
            state.isSelected && 'bg-primary text-primary-foreground',
            state.isFocused && !state.isSelected && 'bg-accent'
          )
      }}
    />
  );
}
