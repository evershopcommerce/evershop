import { StandaloneMetafieldCard } from '@components/admin/metafield/StandaloneMetafieldCard.js';
import { SettingMenu } from '@components/admin/SettingMenu.js';
import Spinner from '@components/admin/Spinner.js';
import Area from '@components/common/Area.js';
import { EmailField } from '@components/common/form/EmailField.js';
import { Form, useFormContext } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { ReactSelectField } from '@components/common/form/ReactSelectField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { TelField } from '@components/common/form/TelField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { Item } from '@components/common/ui/Item.js';
import { Skeleton } from '@components/common/ui/Skeleton.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

function ShopCustomFields({
  setting
}: {
  setting?: {
    metaData?: Record<string, unknown>;
    storeCurrency?: string;
    shopMetafieldsApi?: string;
  } | null;
}): React.ReactElement | null {
  // Store-wide custom fields. Rendered as a sibling card BELOW the store-settings
  // form (same `content` area, higher sortOrder) so its own form doesn't nest
  // inside the settings form. Values live in the `metafield_shop` singleton.
  if (!setting?.shopMetafieldsApi) return null;
  return (
    <StandaloneMetafieldCard
      ownerType="shop"
      values={setting.metaData}
      currency={setting.storeCurrency ?? 'USD'}
      saveUrl={setting.shopMetafieldsApi}
    />
  );
}

const ProvincesQuery = `
  query Province($countries: [String]) {
    provinces (countries: $countries) {
      code
      name
      countryCode
    }
  }
`;

const CountriesQuery = `
  query Country($countries: [String]) {
    countries (countries: $countries) {
      code
      name
    }
  }
`;

const Province: React.FC<{
  selectedCountry: string;
  selectedProvince: string;
  allowedCountries?: string[];
  fieldName?: string;
}> = ({
  selectedCountry = 'US',
  selectedProvince,
  allowedCountries = [],
  fieldName = 'storeProvince'
}) => {
  const { setValue } = useFormContext();

  const [result] = useQuery({
    query: ProvincesQuery,
    variables: { countries: allowedCountries }
  });
  const { data, fetching, error } = result;
  useEffect(() => {
    if (fetching || !data) return;
    const provinces = data.provinces.filter(
      (p) => p.countryCode === selectedCountry
    );
    if (provinces.every((p) => p.code !== selectedProvince)) {
      setValue(fieldName, '');
    }
  }, [selectedCountry, fetching]);
  if (fetching)
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="w-1/2 h-5 rounded-md" />
        <Skeleton className="w-full h-9 rounded-md" />
      </div>
    );
  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }
  const provinces = data.provinces.filter(
    (p) => p.countryCode === selectedCountry
  );
  if (!provinces.length) {
    return null;
  }

  return (
    <div>
      <SelectField
        id="storeProvince"
        defaultValue={selectedProvince}
        name={fieldName}
        label="Province"
        placeholder="Province"
        required
        options={provinces.map((p) => ({ value: p.code, label: p.name }))}
      />
    </div>
  );
};

const Country: React.FC<{
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  allowedCountries?: string[];
  fieldName?: string;
}> = ({
  selectedCountry,
  setSelectedCountry,
  allowedCountries = [],
  fieldName = 'storeCountry'
}) => {
  const onChange = (value: string) => {
    setSelectedCountry(value);
  };
  const [result] = useQuery({
    query: CountriesQuery,
    variables: { countries: allowedCountries }
  });

  const { data, fetching, error } = result;

  if (fetching)
    return (
      <Item variant={'outline'}>
        <Spinner width={'2rem'} height={'2rem'} />
      </Item>
    );
  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <SelectField
        defaultValue={selectedCountry}
        name={fieldName}
        label="Country"
        placeholder="Country"
        onChange={onChange}
        required
        options={data.countries.map((c) => ({ value: c.code, label: c.name }))}
      />
    </div>
  );
};

/** Native display name for a locale code (autonym), falling back to the upper-cased code. */
function localeLabel(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
  } catch {
    return code.toUpperCase();
  }
}

const LanguageSettings: React.FC<{
  storeLanguage: string;
  storeLanguages: string[];
  adminLanguage: string;
  installedLocales: string[];
}> = ({ storeLanguage, storeLanguages, adminLanguage, installedLocales }) => {
  const options = installedLocales.map((code) => ({
    value: code,
    label: localeLabel(code)
  }));
  // "Additional languages" never lists the default — it's always included implicitly
  // (enabled set = default + additional), so offering it here would be confusing.
  const additionalOptions = options.filter((o) => o.value !== storeLanguage);
  return (
    <CardContent className="pt-3 border-t border-border">
      <CardTitle>Languages</CardTitle>
      <div className="space-y-3 mt-5">
        <SelectField
          name="storeLanguage"
          label="Default language"
          defaultValue={storeLanguage}
          required
          options={options}
          helperText="The storefront's primary language. Pages in this language have no URL prefix."
        />
        <ReactSelectField
          name="storeLanguages"
          label="Additional languages"
          isMulti
          defaultValue={storeLanguages}
          options={additionalOptions}
          helperText="Extra languages shoppers can switch to, on top of the default. The default language is always available — you don't add it here."
        />
        <SelectField
          name="adminLanguage"
          label="Admin panel language"
          defaultValue={adminLanguage}
          required
          options={options}
          helperText="The language of the admin panel, independent of the storefront."
        />
      </div>
    </CardContent>
  );
};

const StorePhoneNumber: React.FC<{ storePhoneNumber: string }> = ({
  storePhoneNumber
}) => {
  return (
    <div>
      <TelField
        name="storePhoneNumber"
        label="Store Phone Number"
        placeholder="Store Phone Number"
        defaultValue={storePhoneNumber}
      />
    </div>
  );
};

const StoreEmail: React.FC<{ storeEmail: string }> = ({ storeEmail }) => {
  return (
    <div>
      <EmailField
        name="storeEmail"
        label="Store Email"
        placeholder="Store Email"
        defaultValue={storeEmail}
      />
    </div>
  );
};

interface StoreSettingProps {
  saveSettingApi: string;
  setting: {
    storeName: string;
    storeDescription: string;
    storeLanguage: string;
    storeLanguages: string[];
    adminLanguage: string;
    installedLocales: string[];
    storePhoneNumber: string;
    storeEmail: string;
    storeCountry: string;
    storeAddress: string;
    storeCity: string;
    storeProvince: string;
    storePostalCode: string;
    metaData?: Record<string, unknown>;
    storeCurrency?: string;
    shopMetafieldsApi?: string;
  };
}

export default function StoreSetting({
  saveSettingApi,
  setting: {
    storeName,
    storeDescription,
    storeLanguage,
    storeLanguages,
    adminLanguage,
    installedLocales,
    storePhoneNumber,
    storeEmail,
    storeCountry,
    storeAddress,
    storeCity,
    storeProvince,
    storePostalCode,
    metaData,
    storeCurrency,
    shopMetafieldsApi
  }
}: StoreSettingProps) {
  const [selectedCountry, setSelectedCountry] = React.useState(() => {
    const country = storeCountry;
    if (!country) {
      return 'US';
    } else {
      return country;
    }
  });

  // The save succeeded; surface any non-blocking warnings (e.g. an enabled language with
  // no translations yet) alongside the success toast. Defining onSuccess overrides the
  // Form's default success toast, so we raise it here.
  const onSuccess = (result: { warnings?: string[] }) => {
    toast.success(_('Saved successfully!'));
    (result?.warnings ?? []).forEach((message) => toast.warn(message));
  };

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="storeSetting"
            action={saveSettingApi}
            onSuccess={onSuccess}
            submitBtn={false}
          >
            <Card>
              <CardHeader>
                <CardTitle>Store Settings</CardTitle>
                <CardDescription>
                  Configure your store information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Area
                  id="storeInfoSetting"
                  className="space-y-3"
                  coreComponents={[
                    {
                      component: {
                        default: (
                          <InputField
                            name="storeName"
                            label="Store Name"
                            required
                            placeholder="Store Name"
                            defaultValue={storeName}
                          />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: (
                          <TextareaField
                            name="storeDescription"
                            label="Store Description"
                            placeholder="Store Description"
                            defaultValue={storeDescription}
                            required
                          />
                        )
                      },
                      sortOrder: 20
                    }
                  ]}
                />
              </CardContent>
              <CardContent className="pt-3 border-t border-border">
                <CardTitle>Contact Information</CardTitle>
                <Area
                  id="storeContactSetting"
                  coreComponents={[
                    {
                      component: {
                        default: StorePhoneNumber
                      },
                      props: {
                        storePhoneNumber
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: StoreEmail
                      },
                      props: {
                        storeEmail
                      },
                      sortOrder: 20
                    }
                  ]}
                  className="grid grid-cols-2 gap-5 mt-5"
                />
              </CardContent>
              <CardContent className="pt-3 border-t border-border">
                <CardTitle>Address</CardTitle>
                <div className="space-y-3">
                  <Country
                    selectedCountry={storeCountry}
                    setSelectedCountry={setSelectedCountry}
                  />
                  <InputField
                    name="storeAddress"
                    label="Address"
                    defaultValue={storeAddress}
                    placeholder="Store Address"
                  />
                </div>
                <div className="grid grid-cols-3 gap-5 mt-5">
                  <div>
                    <InputField
                      name="storeCity"
                      label="City"
                      defaultValue={storeCity}
                      placeholder="City"
                    />
                  </div>
                  <Province
                    selectedProvince={storeProvince}
                    selectedCountry={selectedCountry}
                  />
                  <div>
                    <InputField
                      name="storePostalCode"
                      label="Postal Code"
                      defaultValue={storePostalCode}
                      placeholder="Postal Code"
                    />
                  </div>
                </div>
              </CardContent>
              <LanguageSettings
                storeLanguage={storeLanguage}
                storeLanguages={storeLanguages}
                adminLanguage={adminLanguage}
                installedLocales={installedLocales}
              />
              <CardFooter>
                <div className="flex justify-end w-full">
                  <Button
                    type="submit"
                    className="btn btn-primary"
                    form="storeSetting"
                  >
                    Save Settings
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </Form>
          <div className="mt-6">
            <ShopCustomFields
              setting={{
                metaData,
                storeCurrency,
                shopMetafieldsApi
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
    setting {
      storeName
      storeDescription
      storeLanguage
      storeLanguages
      adminLanguage
      installedLocales
      storeTimeZone
      storePhoneNumber
      storeEmail
      storeCountry
      storeAddress
      storeCity
      storeProvince
      storePostalCode
      metaData
      storeCurrency
      shopMetafieldsApi
    }
  }
`;
