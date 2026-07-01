import { BrandAssetUploader } from '@components/admin/BrandAssetUploader.js';
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
import { LANGUAGES } from '@components/common/locale/LanguageOption.js';
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

// Pinned to the `Weight.unit` / `Dimension.unit` vocabularies (see oms/types/carrier.ts and
// the createShipment normalizer). These are display labels only — stored weights/dimensions
// are unit-less numbers, so changing the unit relabels existing data, it does not convert it.
const WEIGHT_UNITS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'lb', label: 'Pound (lb)' },
  { value: 'oz', label: 'Ounce (oz)' }
];

const DIMENSION_UNITS = [
  { value: 'cm', label: 'Centimeter (cm)' },
  { value: 'mm', label: 'Millimeter (mm)' },
  { value: 'in', label: 'Inch (in)' }
];

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
        label={_('Province')}
        placeholder={_('Province')}
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
        label={_('Country')}
        placeholder={_('Country')}
        onChange={onChange}
        required
        options={data.countries.map((c) => ({ value: c.code, label: c.name }))}
      />
    </div>
  );
};

/** Display name for a locale code in a target language; `undefined` if unresolved. */
function displayName(inLocale: string, code: string): string | undefined {
  try {
    const name = new Intl.DisplayNames([inLocale], { type: 'language' }).of(
      code
    );
    // Intl echoes the input code back when it can't resolve a name — treat that
    // as "unknown" so callers can fall back to the curated English label.
    return name && name.toLowerCase() !== code.toLowerCase() ? name : undefined;
  } catch {
    return undefined;
  }
}

const LanguageSettings: React.FC<{
  storeLanguage: string;
  storeLanguages: string[];
  adminLanguage: string;
}> = ({ storeLanguage, storeLanguages, adminLanguage }) => {
  // Offer every ISO 639-1 language, not just those that ship a translation
  // folder. A language without a folder simply falls back to English strings
  // until one is added (saveSetting warns, it does not block).
  const options = React.useMemo(
    () =>
      LANGUAGES.map(({ value, text }) => {
        // Clean English name via Intl (e.g. "Greek" not "Greek, Modern (1453-)"),
        // with the curated ISO label as fallback; append the native autonym when
        // it differs, e.g. "Vietnamese (Tiếng Việt)".
        const english = displayName('en', value) ?? text;
        const native = displayName(value, value);
        const showNative =
          !!native && native.toLowerCase() !== english.toLowerCase();
        return {
          value,
          label: showNative ? `${english} (${native})` : english
        };
      }).sort((a, b) => a.label.localeCompare(b.label)),
    []
  );
  // "Additional languages" never lists the default — it's always included implicitly
  // (enabled set = default + additional), so offering it here would be confusing.
  const additionalOptions = options.filter((o) => o.value !== storeLanguage);
  return (
    <CardContent className="pt-3 border-t border-border">
      <CardTitle>{_('Languages')}</CardTitle>
      <div className="space-y-3 mt-5">
        <SelectField
          name="storeLanguage"
          label={_('Default language')}
          defaultValue={storeLanguage}
          required
          options={options}
          helperText={_(
            "The storefront's primary language. Pages in this language have no URL prefix."
          )}
        />
        {/* <ReactSelectField
          name="storeLanguages"
          label={_('Additional languages')}
          isMulti
          defaultValue={storeLanguages}
          options={additionalOptions}
          helperText={_(
            "Extra languages shoppers can switch to, on top of the default. The default language is always available — you don't add it here."
          )}
        /> */}
        <SelectField
          name="adminLanguage"
          label={_('Admin panel language')}
          defaultValue={adminLanguage}
          required
          options={options}
          helperText={_(
            'The language of the admin panel, independent of the storefront.'
          )}
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
        label={_('Store Phone Number')}
        placeholder={_('Store Phone Number')}
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
        label={_('Store Email')}
        placeholder={_('Store Email')}
        defaultValue={storeEmail}
      />
    </div>
  );
};

interface CodeName {
  code: string;
  name: string;
}

interface StoreSettingProps {
  saveSettingApi: string;
  timezones: CodeName[];
  currencies: CodeName[];
  setting: {
    storeName: string;
    storeDescription: string;
    storeLanguage: string;
    storeLanguages: string[];
    adminLanguage: string;
    storeTimeZone: string;
    storePhoneNumber: string;
    storeEmail: string;
    storeCountry: string;
    storeAddress: string;
    storeCity: string;
    storeProvince: string;
    storePostalCode: string;
    metaData?: Record<string, unknown>;
    storeCurrency?: string;
    weightUnit?: string;
    dimensionUnit?: string;
    shopMetafieldsApi?: string;
    logo?: string;
    logoWidth?: string;
    logoHeight?: string;
    favicon?: string;
    socialSharingImage?: string;
    gaMeasurementId?: string;
  };
}

export default function StoreSetting({
  saveSettingApi,
  timezones,
  currencies,
  setting: {
    storeName,
    storeDescription,
    storeLanguage,
    storeLanguages,
    adminLanguage,
    storeTimeZone,
    storePhoneNumber,
    storeEmail,
    storeCountry,
    storeAddress,
    storeCity,
    storeProvince,
    storePostalCode,
    metaData,
    storeCurrency,
    weightUnit,
    dimensionUnit,
    shopMetafieldsApi,
    logo,
    logoWidth,
    logoHeight,
    favicon,
    socialSharingImage,
    gaMeasurementId
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
                <CardTitle>{_('Store Settings')}</CardTitle>
                <CardDescription>
                  {_('Configure your store information')}
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
                            label={_('Store Name')}
                            required
                            placeholder={_('Store Name')}
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
                            label={_('Store Description')}
                            placeholder={_('Store Description')}
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
                <CardTitle>{_('Contact Information')}</CardTitle>
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
                <CardTitle>{_('Address')}</CardTitle>
                <div className="space-y-3">
                  <Country
                    selectedCountry={storeCountry}
                    setSelectedCountry={setSelectedCountry}
                  />
                  <InputField
                    name="storeAddress"
                    label={_('Address')}
                    defaultValue={storeAddress}
                    placeholder={_('Store Address')}
                  />
                </div>
                <div className="grid grid-cols-3 gap-5 mt-5">
                  <div>
                    <InputField
                      name="storeCity"
                      label={_('City')}
                      defaultValue={storeCity}
                      placeholder={_('City')}
                    />
                  </div>
                  <Province
                    selectedProvince={storeProvince}
                    selectedCountry={selectedCountry}
                  />
                  <div>
                    <InputField
                      name="storePostalCode"
                      label={_('Postal Code')}
                      defaultValue={storePostalCode}
                      placeholder={_('Postal Code')}
                    />
                  </div>
                </div>
              </CardContent>
              <LanguageSettings
                storeLanguage={storeLanguage}
                storeLanguages={storeLanguages}
                adminLanguage={adminLanguage}
              />
              <CardContent className="pt-3 border-t border-border">
                <CardTitle>{_('Regional & Units')}</CardTitle>
                <div className="grid grid-cols-2 gap-5 mt-5">
                  <SelectField
                    name="storeCurrency"
                    label={_('Currency')}
                    defaultValue={storeCurrency}
                    required
                    options={currencies.map((c) => ({
                      value: c.code,
                      label: `${c.name} (${c.code})`
                    }))}
                    helperText={_(
                      'Default currency for new carts and price display. Existing orders keep their own currency.'
                    )}
                  />
                  <SelectField
                    name="storeTimeZone"
                    label={_('Timezone')}
                    defaultValue={storeTimeZone}
                    required
                    options={timezones.map((t) => ({
                      value: t.code,
                      label: t.name
                    }))}
                    helperText={_(
                      'Timezone used to display dates in the store.'
                    )}
                  />
                  <SelectField
                    name="weightUnit"
                    label={_('Weight unit')}
                    defaultValue={weightUnit}
                    required
                    options={WEIGHT_UNITS}
                  />
                  <SelectField
                    name="dimensionUnit"
                    label={_('Dimension unit')}
                    defaultValue={dimensionUnit}
                    required
                    options={DIMENSION_UNITS}
                  />
                </div>
              </CardContent>
              <CardContent className="pt-3 border-t border-border">
                <CardTitle>{_('Branding')}</CardTitle>
                <CardDescription>
                  {_(
                    'Your logo, favicon, and the image shown when your store is shared on social media.'
                  )}
                </CardDescription>
                <div className="space-y-8 mt-5">
                  <div>
                    <div className="font-medium mb-1">{_('Logo')}</div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {_(
                        'Shown in the storefront header. Use a high-resolution PNG with a transparent background — it is scaled to fit your theme automatically and served as optimized WebP.'
                      )}
                    </p>
                    <BrandAssetUploader
                      name="logo"
                      defaultValue={logo}
                      previewType="logo"
                      widthName="logoWidth"
                      heightName="logoHeight"
                      defaultWidth={logoWidth}
                      defaultHeight={logoHeight}
                    />
                  </div>
                  <div>
                    <div className="font-medium mb-1">{_('Favicon')}</div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {_(
                        'The small icon in browser tabs. Upload a square PNG of at least 512×512px — the 16/32px icons and the 180px Apple touch icon are generated automatically.'
                      )}
                    </p>
                    <BrandAssetUploader
                      name="favicon"
                      defaultValue={favicon}
                      previewType="favicon"
                    />
                  </div>
                  <div>
                    <div className="font-medium mb-1">
                      {_('Social sharing image')}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {_(
                        'The preview shown when a page is shared on social media (Open Graph / Twitter). Recommended 1200×630px (1.91:1), PNG or JPG.'
                      )}
                    </p>
                    <BrandAssetUploader
                      name="socialSharingImage"
                      defaultValue={socialSharingImage}
                      previewType="social"
                    />
                  </div>
                </div>
              </CardContent>
              <CardContent className="pt-3 border-t border-border">
                <CardTitle>{_('Analytics')}</CardTitle>
                <div className="mt-5">
                  <InputField
                    name="gaMeasurementId"
                    label={_('Google Analytics 4 Measurement ID')}
                    placeholder="G-XXXXXXXXXX"
                    defaultValue={gaMeasurementId}
                    helperText={_(
                      'Found in Google Analytics under Admin → Data Streams → your web stream. Leave empty to disable tracking.'
                    )}
                    validation={{
                      pattern: {
                        value: /^G-[A-Z0-9]+$/i,
                        message: _(
                          'Enter a valid GA4 Measurement ID, e.g. G-XXXXXXXXXX'
                        )
                      }
                    }}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex justify-end w-full">
                  <Button
                    type="submit"
                    className="btn btn-primary"
                    form="storeSetting"
                  >
                    {_('Save Settings')}
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
    timezones {
      code
      name
    }
    currencies {
      code
      name
    }
    setting {
      storeName
      storeDescription
      storeLanguage
      storeLanguages
      adminLanguage
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
      weightUnit
      dimensionUnit
      shopMetafieldsApi
      logo
      logoWidth
      logoHeight
      favicon
      socialSharingImage
      gaMeasurementId
    }
  }
`;
