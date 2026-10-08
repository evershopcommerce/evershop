import Area from '@components/common/Area.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { CardContent, CardDescription, CardTitle } from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * The "Addresses" section of Settings → Customer (Address Format Registry
 * § 3.13): seven of the eight `address*` setting rows, posted with the page
 * form through the generic `saveSetting` upsert. The eighth,
 * `addressSellToCountries`, lives with the shipping zones it interacts with
 * (Settings → Shipping). Country formats, region lists and label text are
 * national conventions and are deliberately not editable.
 */
export interface CustomerAddressSettingValues {
  addressNameFormat: string;
  addressTelephone: string;
  addressOrganization: string;
  addressLine2: string;
  addressLine3: string;
  addressRequired: Record<string, string>;
  addressDefaultCountry: string;
}

export interface CountryOption {
  code: string;
  name: string;
}

/** The postal fields a merchant may tighten (spec § 3.13: tighten only). */
const REQUIRABLE_FIELDS: { id: string; label: () => string }[] = [
  { id: 'locality', label: () => _('City') },
  { id: 'administrative_area', label: () => _('State / Province') },
  { id: 'postal_code', label: () => _('Postal code') },
  { id: 'dependent_locality', label: () => _('Ward / Neighbourhood') },
  { id: 'address_line_2', label: () => _('Address line 2') }
];

function AddressFields({
  setting,
  countries
}: {
  setting: CustomerAddressSettingValues;
  countries: CountryOption[];
}) {
  const required = setting.addressRequired ?? {};
  return (
    <div className="space-y-4">
      <SelectField
        name="addressNameFormat"
        label={_('Name format')}
        defaultValue={setting.addressNameFormat}
        options={[
          { value: 'single', label: _('Single field') },
          { value: 'split', label: _('First and last name') }
        ]}
        helperText={_(
          'Switching is safe either way: saved addresses keep displaying and are converted when edited.'
        )}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          name="addressTelephone"
          label={_('Telephone')}
          defaultValue={setting.addressTelephone}
          options={[
            { value: 'required', label: _('Required') },
            { value: 'optional', label: _('Optional') },
            { value: 'hidden', label: _('Hidden') }
          ]}
        />
        <SelectField
          name="addressOrganization"
          label={_('Company')}
          defaultValue={setting.addressOrganization}
          options={[
            { value: 'optional', label: _('Optional') },
            { value: 'required', label: _('Required') },
            { value: 'hidden', label: _('Hidden') }
          ]}
        />
        <SelectField
          name="addressLine2"
          label={_('Address line 2')}
          defaultValue={setting.addressLine2}
          options={[
            { value: 'shown', label: _('Shown') },
            { value: 'hidden', label: _('Hidden') }
          ]}
        />
        <SelectField
          name="addressLine3"
          label={_('Address line 3')}
          defaultValue={setting.addressLine3}
          options={[
            { value: 'disabled', label: _('Disabled') },
            { value: 'enabled', label: _('Enabled') }
          ]}
        />
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{_('Required fields')}</legend>
        <p className="text-muted-foreground text-xs">
          {_(
            'Fields a country leaves optional can be made mandatory here; nothing a country requires is ever made optional.'
          )}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {REQUIRABLE_FIELDS.map((f) => (
            <SelectField
              key={f.id}
              name={`addressRequired.${f.id}`}
              label={f.label()}
              defaultValue={required[f.id] === 'required' ? 'required' : 'asCountry'}
              options={[
                { value: 'asCountry', label: _('As the country requires') },
                { value: 'required', label: _('Always required') }
              ]}
            />
          ))}
        </div>
      </fieldset>
      <SelectField
        name="addressDefaultCountry"
        label={_('Default country')}
        defaultValue={setting.addressDefaultCountry}
        options={[
          { value: 'store', label: _('Use store country') },
          { value: 'none', label: _('No default') },
          ...countries.map((c) => ({ value: c.code, label: c.name }))
        ]}
        helperText={_(
          'Pre-selected on a new address. Shipping is still limited to the countries your zones cover.'
        )}
      />
    </div>
  );
}

/** One section of the customer settings card. Area `customerAddressSetting` lets an extension add controls. */
export function AddressSection({
  setting,
  countries
}: {
  setting: CustomerAddressSettingValues;
  countries: CountryOption[];
}) {
  return (
    <CardContent className="pt-3 border-t border-border">
      <CardTitle>{_('Addresses')}</CardTitle>
      <CardDescription>
        {_(
          'What every address form collects, in the address book and at checkout. Country layouts, region lists and labels follow each country and are not editable.'
        )}
      </CardDescription>
      <Area
        id="customerAddressSetting"
        className="mt-5 space-y-5"
        coreComponents={[
          {
            id: 'customerAddressFields',
            component: { default: AddressFields },
            props: { setting, countries },
            sortOrder: 10
          }
        ]}
      />
    </CardContent>
  );
}
