import { AddressFields } from '@components/frontStore/customer/address/AddressFields.js';
import { AddressFormLoadingSkeleton } from '@components/frontStore/customer/address/addressForm/AddressFormLoadingSkeleton.js';
import { fieldName, initialValuesFor } from '@components/frontStore/customer/address/addressFormLogic.js';
import { useAddressSchema } from '@components/frontStore/customer/address/useAddressSchema.js';
import type { AddressSurface, ResolvedAddressSchema } from '@evershop/evershop/lib/address/types';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import type { AddressGraphql } from '@evershop/evershop/types/address';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useQuery } from 'urql';

/**
 * The address form container (spec § 3.9) — the `@components` entry a theme
 * may override. It fetches the countries the surface offers and the schema
 * for the chosen country (none chosen → the store's default-country setting,
 * D-20), then hands everything to the renderer. Three surfaces, one
 * component: `surface` picks the country scope and the Area id suffix,
 * `namePrefix` the form field prefix.
 */
export const AddressFormCountriesQuery = `
  query AddressFormCountries($scope: CountryScope) {
    countries(scope: $scope) {
      value: code
      label: name
    }
  }
`;

export type AddressCountryScope = 'SHIPPING' | 'SELL_TO' | 'ALL';

export interface AddressFormProps {
  address?: AddressGraphql | null;
  /** 'account' | 'shipping' | 'billing'. Default 'account'. */
  surface?: AddressSurface;
  /** '' (account), 'shippingAddress', 'billingAddress'. Default ''. */
  namePrefix?: string;
  /** Override the scope the surface implies (shipping → SHIPPING, others → SELL_TO). */
  countryScope?: AddressCountryScope;
}

export default function Index({
  address = null,
  surface = 'account',
  namePrefix = '',
  countryScope
}: AddressFormProps) {
  const scope: AddressCountryScope =
    countryScope ?? (surface === 'shipping' ? 'SHIPPING' : 'SELL_TO');
  const { control, getValues, setValue } = useFormContext();
  const countryFieldName = fieldName(namePrefix, 'country');
  const watchedCountry = useWatch({ control, name: countryFieldName }) as unknown;
  const [chosenCountry, setChosenCountry] = useState<string | null>(
    address?.country?.code ?? null
  );
  const country =
    (watchedCountry !== undefined && watchedCountry !== null && String(watchedCountry)) ||
    chosenCountry;

  const [countriesResult] = useQuery({
    query: AddressFormCountriesQuery,
    variables: { scope }
  });
  const { schema: fetchedSchema, fetching, error } = useAddressSchema(country, surface);

  // Keep the last schema while the next country's is in flight, so the form
  // stays mounted through a swap (an unmount would drop every value under
  // `shouldUnregister: true`). The renderer runs the clearing rule itself.
  const lastSchema = useRef<ResolvedAddressSchema | undefined>(undefined);
  if (fetchedSchema) {
    lastSchema.current = fetchedSchema;
  }
  const schema = fetchedSchema ?? lastSchema.current;

  // A new address: the server resolved the default country; put it in the
  // form so the schema and the select agree on which country is being entered.
  useEffect(() => {
    if (!schema) return;
    const current = String(getValues(countryFieldName) ?? '');
    if (current === '' && schema.country) {
      setValue(countryFieldName, schema.country, { shouldDirty: false });
      setChosenCountry(schema.country);
    }
  }, [schema?.country]);

  // One country offered → the form is for it (the renderer shows it read-only).
  const offered = countriesResult.data?.countries as { value: string }[] | undefined;
  const fixedCountry = offered && offered.length === 1 ? offered[0].value : null;
  useEffect(() => {
    if (!fixedCountry) return;
    if (String(getValues(countryFieldName) ?? '') !== fixedCountry) {
      setValue(countryFieldName, fixedCountry, { shouldDirty: false });
    }
    setChosenCountry(fixedCountry);
  }, [fixedCountry]);

  const initialValues = useMemo(
    () => (schema ? initialValuesFor(address, schema) : {}),
    [address, schema]
  );

  if (error || countriesResult.error) {
    return (
      <p className="address-form__error text-sm text-destructive">
        {(error ?? countriesResult.error)?.message}
      </p>
    );
  }
  if (!schema || countriesResult.fetching) {
    return <AddressFormLoadingSkeleton />;
  }
  const countries = countriesResult.data?.countries ?? [];
  // Spec § 3.13 / AC13: the shipping surface offers sell-to ∩ zone countries;
  // when that set is empty the merchant's configuration, not the customer, is
  // at fault — say so instead of showing a country select with no options.
  if (surface === 'shipping' && countries.length === 0) {
    return (
      <p className="address-form__notice text-sm text-destructive" role="status">
        {_('Shipping is not available at the moment. Please contact us to complete your order.')}
      </p>
    );
  }

  return (
    <AddressFields
      schema={schema}
      namePrefix={namePrefix}
      surface={surface}
      countries={countries}
      initialValues={initialValues}
      onCountryChange={(code) => setChosenCountry(code)}
    />
  );
}
