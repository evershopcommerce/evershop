import { CheckboxField } from '@components/common/form/CheckboxField.js';
import { InputField } from '@components/common/form/InputField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@components/common/ui/Alert.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Plus, Trash2, TriangleAlert } from 'lucide-react';
import React from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

interface OverrideRow {
  type: string;
  maxSize: number | string;
}

interface MimeTypeOption {
  value: string;
  label: string;
}

interface FileStorageSettingProps {
  setting: {
    fileStorage: string;
    s3Region?: string;
    s3Bucket?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3Endpoint?: string;
    s3ForcePathStyle: boolean;
    s3BaseUrl?: string;
    azureStorageConnectionString?: string;
    azureStorageContainerName: string;
    azureContainerAccess: string;
    azureBaseUrl?: string;
    gcsBucket?: string;
    gcsServiceAccountKey?: string;
    gcsBaseUrl?: string;
    fileStorageConfigOverrides: string[];
    uploadMaxFileSize?: number | null;
    uploadMaxFileSizePinned: boolean;
    uploadMaxFileSizePerType: OverrideRow[];
    uploadMaxFileSizePerTypePinned: boolean;
    uploadAllowedMimeTypes: string[];
    uploadMimeTypeOptions: MimeTypeOption[];
    uploadAllowedMimeTypesConfigExtras: string[];
  };
}

/** The built-in defaults, pre-checked when the admin has not saved a selection */
const DEFAULT_TYPE_SELECTION = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/apng'
];

/** `type/subtype` or a family wildcard `type/*` */
const MIME_PATTERN = /^[a-z0-9.+-]+\/(\*|[a-z0-9.+-]+)$/i;

function PerTypeOverrides({ initial }: { initial: OverrideRow[] }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'uploadMaxFileSizePerType'
  });

  // Seed once from the saved rows. useFieldArray starts empty because the
  // page-level form has no defaultValues for this key.
  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!seeded.current && fields.length === 0 && initial.length > 0) {
      initial.forEach((row) => append(row, { shouldFocus: false }));
    }
    seeded.current = true;
  }, []);

  return (
    <div className="grid gap-3">
      {fields.length === 0 && (
        // The page form unregisters unmounted fields, so an empty list would
        // vanish from the save payload and the previously saved overrides
        // would silently survive. This marker posts an explicit "no
        // overrides" value instead; it unmounts as soon as a row exists.
        <InputField
          type="hidden"
          name="uploadMaxFileSizePerType"
          defaultValue="[]"
        />
      )}
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-3 items-start">
          <div className="flex-1">
            <InputField
              name={`uploadMaxFileSizePerType.${index}.type`}
              placeholder="video/mp4 or video/*"
              validation={{
                required: _('Enter a type or remove the row'),
                validate: (value: string) =>
                  MIME_PATTERN.test(String(value).trim()) ||
                  _('Use type/subtype (video/mp4) or a family (video/*)')
              }}
            />
          </div>
          <div className="w-40">
            <InputField
              name={`uploadMaxFileSizePerType.${index}.maxSize`}
              type="number"
              min={0}
              step="any"
              placeholder={_('MB')}
              validation={{
                required: _('Enter a size'),
                validate: (value: string) =>
                  Number(value) > 0 || _('Enter a size greater than zero')
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => remove(index)}
            aria-label={_('Remove override')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ type: '', maxSize: '' })}
        >
          <Plus className="h-4 w-4 mr-1" />
          {_('Add type override')}
        </Button>
      </div>
    </div>
  );
}

/** Loose client-side shape check for a pasted service-account key file */
const looksLikeServiceAccountKey = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed?.client_email && parsed?.private_key);
  } catch {
    return false;
  }
};

/**
 * Visible hint below a control. The Field components' `helperText` prop
 * renders as a tooltip on the field LABEL — these rows carry their label in
 * the left column instead, so a tooltip would never show.
 */
export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs mt-1.5 text-muted-foreground">{children}</p>;
}

export function SettingRow({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <CardContent className="pt-4 border-t border-border">
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 items-center flex">
          <h4>{label}</h4>
        </div>
        <div className="col-span-2">{children}</div>
      </div>
    </CardContent>
  );
}

/**
 * Values pinned by config file / environment variable are shown read-only and
 * OUTSIDE the form — a disabled-but-registered input would still post its
 * (possibly masked) value to saveSetting and overwrite the DB row with
 * garbage.
 */
export function PinnedValue({ value }: { value?: string | null }) {
  return (
    <div className="text-sm border border-border rounded-md px-3 py-2 bg-muted/30 text-muted-foreground">
      <span className="break-all">{value || '—'}</span>
      <p className="text-xs mt-1">
        {_('Managed by configuration (config file or environment variable)')}
      </p>
    </div>
  );
}

export default function FileStorageSetting({
  setting
}: FileStorageSettingProps) {
  const provider = useWatch({
    name: 'fileStorage',
    defaultValue: setting.fileStorage
  });
  const pinned = (name: string) =>
    setting.fileStorageConfigOverrides.includes(name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('File Storage & Uploads')}</CardTitle>
        <CardDescription>
          {_(
            'Where uploaded files (product images, banners, media) are stored, which types are allowed, and how big they can be'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 items-center flex">
            <h4>{_('Provider')}</h4>
          </div>
          <div className="col-span-2">
            <RadioGroupField
              name="fileStorage"
              defaultValue={setting.fileStorage}
              options={[
                { label: _('Local file system'), value: 'local' },
                { label: _('Amazon S3 / S3-compatible'), value: 's3' },
                { label: _('Azure Blob Storage'), value: 'azure' },
                { label: _('Google Cloud Storage'), value: 'gcs' }
              ]}
            />
          </div>
        </div>
      </CardContent>
      {provider === 's3' && (
        <>
          <SettingRow label={_('Bucket')}>
            {pinned('s3Bucket') ? (
              <PinnedValue value={setting.s3Bucket} />
            ) : (
              <InputField
                name="s3Bucket"
                required
                validation={{ required: _('Bucket is required') }}
                placeholder={_('Bucket name')}
                defaultValue={setting.s3Bucket || ''}
              />
            )}
          </SettingRow>
          <SettingRow label={_('Region')}>
            {pinned('s3Region') ? (
              <PinnedValue value={setting.s3Region} />
            ) : (
              <>
                <InputField
                  name="s3Region"
                  required
                  validation={{ required: _('Region is required') }}
                  placeholder="us-east-1"
                  defaultValue={setting.s3Region || ''}
                />
                <FieldHint>
                  {_(
                    'For S3-compatible services use the provider value (e.g. fsn1 for Hetzner)'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
          <SettingRow label={_('Access key ID')}>
            {pinned('s3AccessKeyId') ? (
              <PinnedValue value={setting.s3AccessKeyId} />
            ) : (
              <>
                <InputField
                  name="s3AccessKeyId"
                  placeholder={_('Access key ID')}
                  defaultValue={setting.s3AccessKeyId || ''}
                />
                <FieldHint>
                  {_(
                    'Create an access key in your storage provider console. For AWS: sign in to the AWS Console, open IAM → Users → your user → Security credentials → Create access key.'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
          <SettingRow label={_('Secret access key')}>
            {pinned('s3SecretAccessKey') ? (
              <PinnedValue value={setting.s3SecretAccessKey} />
            ) : (
              <>
                <InputField
                  name="s3SecretAccessKey"
                  type="password"
                  placeholder={_('Secret access key')}
                  defaultValue={setting.s3SecretAccessKey || ''}
                />
                <FieldHint>
                  {_(
                    'The secret is shown only once, when the access key is created — copy it from there.'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
          {!pinned('s3AccessKeyId') && !pinned('s3SecretAccessKey') && (
            <CardContent className="pt-3">
              <p className="text-sm text-muted-foreground">
                {_(
                  "Don't have keys? If EverShop runs on a server that already has access to the bucket — for example an AWS IAM role, or AWS keys set up as environment variables on the server — leave both fields empty and the server's own credentials are used automatically. The connection is tested when you save, so a wrong or missing setup cannot be saved."
                )}
              </p>
            </CardContent>
          )}
          <SettingRow label={_('Custom endpoint')}>
            {pinned('s3Endpoint') ? (
              <PinnedValue value={setting.s3Endpoint} />
            ) : (
              <>
                <InputField
                  name="s3Endpoint"
                  placeholder="https://fsn1.your-objectstorage.com"
                  defaultValue={setting.s3Endpoint || ''}
                />
                <FieldHint>
                  {_(
                    'S3-compatible services only (Hetzner, Cloudflare R2, MinIO, DigitalOcean Spaces). Leave empty for AWS.'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
          <SettingRow label={_('Force path-style')}>
            {pinned('s3ForcePathStyle') ? (
              <PinnedValue
                value={setting.s3ForcePathStyle ? _('Yes') : _('No')}
              />
            ) : (
              <>
                <ToggleField
                  name="s3ForcePathStyle"
                  defaultValue={setting.s3ForcePathStyle}
                />
                <FieldHint>
                  {_('Required by MinIO. Leave off for AWS, Hetzner and R2.')}
                </FieldHint>
              </>
            )}
          </SettingRow>
          <SettingRow label={_('Public base URL')}>
            {pinned('s3BaseUrl') ? (
              <PinnedValue value={setting.s3BaseUrl} />
            ) : (
              <>
                <InputField
                  name="s3BaseUrl"
                  placeholder="https://cdn.example.com"
                  defaultValue={setting.s3BaseUrl || ''}
                />
                <FieldHint>
                  {_(
                    'Optional CDN (e.g. CloudFront) serving the bucket — lets the bucket stay private. Without it, objects must be publicly readable via a bucket policy. Example: https://cdn.mystore.com or https://d111abcdef8.cloudfront.net, a CloudFront distribution with this bucket as its origin. Files are served as <this URL>/<file path>, so the domain must point at the bucket root.'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
        </>
      )}
      {provider === 'azure' && (
        <>
          <SettingRow label={_('Connection string')}>
            {pinned('azureStorageConnectionString') ? (
              <PinnedValue value={setting.azureStorageConnectionString} />
            ) : (
              <>
                <InputField
                  name="azureStorageConnectionString"
                  required
                  validation={{ required: _('Connection string is required') }}
                  type="password"
                  placeholder="DefaultEndpointsProtocol=https;AccountName=…"
                  defaultValue={setting.azureStorageConnectionString || ''}
                />
                <FieldHint>
                  {_(
                    'Copy it from the Azure portal: sign in, open your storage account, then Security + networking → Access keys → Connection string.'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
          <SettingRow label={_('Container')}>
            {pinned('azureStorageContainerName') ? (
              <PinnedValue value={setting.azureStorageContainerName} />
            ) : (
              <InputField
                name="azureStorageContainerName"
                placeholder="images"
                defaultValue={setting.azureStorageContainerName || ''}
              />
            )}
          </SettingRow>
          <SettingRow label={_('Container access')}>
            {pinned('azureContainerAccess') ? (
              <PinnedValue value={setting.azureContainerAccess} />
            ) : (
              <>
                <RadioGroupField
                  name="azureContainerAccess"
                  defaultValue={setting.azureContainerAccess}
                  options={[
                    { label: _('Private (recommended)'), value: 'private' },
                    { label: _('Public read for blobs'), value: 'blob' }
                  ]}
                />
                <FieldHint>
                  {_(
                    'Public read requires "Allow blob anonymous access" on the storage account — disallowed by default on new accounts. Prefer a private container with a public base URL (CDN).'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
          <SettingRow label={_('Public base URL')}>
            {pinned('azureBaseUrl') ? (
              <PinnedValue value={setting.azureBaseUrl} />
            ) : (
              <>
                <InputField
                  name="azureBaseUrl"
                  placeholder="https://cdn.example.com"
                  defaultValue={setting.azureBaseUrl || ''}
                />
                <FieldHint>
                  {_(
                    'Optional CDN (e.g. Azure CDN / Front Door) serving the container — lets the container stay private. Files are served as <this URL>/<file path> with no container segment added, so either set the CDN origin path to /<container> (example: https://mystore.azureedge.net) or include the container here (example: https://mystore.azureedge.net/media).'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
        </>
      )}
      {provider === 'gcs' && (
        <>
          <SettingRow label={_('Bucket')}>
            {pinned('gcsBucket') ? (
              <PinnedValue value={setting.gcsBucket} />
            ) : (
              <InputField
                name="gcsBucket"
                required
                validation={{ required: _('Bucket is required') }}
                placeholder={_('Bucket name')}
                defaultValue={setting.gcsBucket || ''}
              />
            )}
          </SettingRow>
          <SettingRow label={_('Service account key')}>
            {pinned('gcsServiceAccountKey') ? (
              <PinnedValue value={setting.gcsServiceAccountKey} />
            ) : (
              <>
                <TextareaField
                  name="gcsServiceAccountKey"
                  rows={5}
                  placeholder='{ "type": "service_account", "project_id": "…", "private_key": "…", "client_email": "…" }'
                  defaultValue={setting.gcsServiceAccountKey || ''}
                  validation={{
                    validate: (value: string) =>
                      !value ||
                      looksLikeServiceAccountKey(value) ||
                      _(
                        'Paste the entire content of the downloaded JSON key file'
                      )
                  }}
                />
                <FieldHint>
                  {_(
                    'Create a key in the Google Cloud Console: IAM & Admin → Service Accounts → create or pick an account with the Storage Object Admin role on the bucket → Keys → Add key → JSON. Paste the whole downloaded file here.'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
          {!pinned('gcsServiceAccountKey') && (
            <CardContent className="pt-3">
              <p className="text-sm text-muted-foreground">
                {_(
                  "Don't have a key? If EverShop runs on Google Cloud (Compute Engine, GKE, Cloud Run) with a service account attached, or the GOOGLE_APPLICATION_CREDENTIALS environment variable is set on the server, leave this field empty and the server's own credentials are used automatically. The connection is tested when you save, so a wrong or missing setup cannot be saved."
                )}
              </p>
            </CardContent>
          )}
          <SettingRow label={_('Public base URL')}>
            {pinned('gcsBaseUrl') ? (
              <PinnedValue value={setting.gcsBaseUrl} />
            ) : (
              <>
                <InputField
                  name="gcsBaseUrl"
                  placeholder="https://cdn.example.com"
                  defaultValue={setting.gcsBaseUrl || ''}
                />
                <FieldHint>
                  {_(
                    'Optional CDN (e.g. Cloud CDN) serving the bucket — lets the bucket stay private. Without it, objects must be publicly readable: grant "allUsers" the Storage Object Viewer role on the bucket (blocked when Public Access Prevention is enforced on your organization). Example: https://cdn.mystore.com, a load balancer domain with this bucket as its backend bucket.'
                  )}
                </FieldHint>
              </>
            )}
          </SettingRow>
        </>
      )}
      {provider === 'local' && (
        <CardContent className="pt-4 border-t border-border">
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>
              {_('Local storage is not recommended for production')}
            </AlertTitle>
            <AlertDescription>
              {_(
                'Files stored on this server can be lost when it is updated, moved, or fails. For a live store, use S3 or Azure Blob Storage instead.'
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
      <CardContent className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold">{_('Upload rules')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {_(
            'What can be uploaded and how big it can be — applies on every storage provider.'
          )}
        </p>
      </CardContent>
      <SettingRow label={_('Allowed file types')}>
        <CheckboxField
          name="uploadAllowedMimeTypes"
          direction="vertical"
          options={setting.uploadMimeTypeOptions}
          defaultValue={
            setting.uploadAllowedMimeTypes.length > 0
              ? setting.uploadAllowedMimeTypes
              : DEFAULT_TYPE_SELECTION
          }
          validation={{
            validate: (value: string[]) =>
              (Array.isArray(value) && value.length > 0) ||
              _('Select at least one file type')
          }}
        />
        <FieldHint>
          {_(
            'Files with other types are rejected at upload. SVG is not offered on purpose — SVG files can contain scripts and are a security risk when served.'
          )}
        </FieldHint>
        {setting.uploadAllowedMimeTypesConfigExtras.length > 0 && (
          <FieldHint>
            {_('Also allowed via server configuration: ${types}', {
              types: setting.uploadAllowedMimeTypesConfigExtras.join(', ')
            })}
          </FieldHint>
        )}
      </SettingRow>
      <SettingRow label={_('Maximum file size')}>
        {setting.uploadMaxFileSizePinned ? (
          <PinnedValue
            value={
              setting.uploadMaxFileSize ? `${setting.uploadMaxFileSize} MB` : null
            }
          />
        ) : (
          <>
            <InputField
              name="uploadMaxFileSize"
              type="number"
              min={0}
              step="any"
              placeholder="10"
              defaultValue={
                setting.uploadMaxFileSize === null ||
                setting.uploadMaxFileSize === undefined
                  ? ''
                  : String(setting.uploadMaxFileSize)
              }
              validation={{
                validate: (value: string) =>
                  !value ||
                  Number(value) > 0 ||
                  _('Enter a size greater than zero')
              }}
            />
            <FieldHint>
              {_(
                'Per file, in megabytes (MB). Leave empty for the default of 10 MB. Applies to every upload in the admin panel — product images, banners, media.'
              )}
            </FieldHint>
          </>
        )}
      </SettingRow>
      <SettingRow label={_('Per-type overrides')}>
        {setting.uploadMaxFileSizePerTypePinned ? (
          <PinnedValue
            value={
              setting.uploadMaxFileSizePerType.length
                ? setting.uploadMaxFileSizePerType
                    .map((row) => `${row.type}: ${row.maxSize} MB`)
                    .join(', ')
                : null
            }
          />
        ) : (
          <>
            <PerTypeOverrides initial={setting.uploadMaxFileSizePerType} />
            <FieldHint>
              {_(
                'Overrides the maximum size for matching file types — for example a smaller limit for images and a bigger one for videos. An exact type (video/mp4) wins over a family (video/*); anything without a match uses the maximum file size above. Overrides do not allow new types: the file type itself must be enabled in "Allowed file types".'
              )}
            </FieldHint>
          </>
        )}
      </SettingRow>
    </Card>
  );
}

export const layout = {
  areaId: 'systemSetting',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      fileStorage
      s3Region
      s3Bucket
      s3AccessKeyId
      s3SecretAccessKey
      s3Endpoint
      s3ForcePathStyle
      s3BaseUrl
      azureStorageConnectionString
      azureStorageContainerName
      azureContainerAccess
      azureBaseUrl
      gcsBucket
      gcsServiceAccountKey
      gcsBaseUrl
      fileStorageConfigOverrides
      uploadMaxFileSize
      uploadMaxFileSizePinned
      uploadMaxFileSizePerType
      uploadMaxFileSizePerTypePinned
      uploadAllowedMimeTypes
      uploadMimeTypeOptions
      uploadAllowedMimeTypesConfigExtras
    }
  }
`;
