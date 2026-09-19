import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getFileStorageConfigOverrides } from '../../../services/storage/storageConfig.js';

type SettingRow = { name: string; value: string };
type GraphQLContext = { user?: unknown };

/**
 * Secrets are masked when pinned by config/env, and returned to authenticated
 * admin users only otherwise (this schema is admin-only, the `user` gate is
 * belt-and-braces — the Stripe setting pattern).
 */
const SECRET_KEYS = [
  's3SecretAccessKey',
  'azureStorageConnectionString',
  'gcsServiceAccountKey'
];

const mask = (value: string): string =>
  `${value.slice(0, 5)}*******************************`;

const findSetting = (
  setting: SettingRow[],
  name: string
): string | undefined => {
  const row = setting.find((s) => s.name === name);
  return row === undefined || row.value === '' ? undefined : row.value;
};

const effectiveValue = (
  setting: SettingRow[],
  name: string,
  context: GraphQLContext
): string | null => {
  const overrides = getFileStorageConfigOverrides();
  if (name in overrides) {
    return SECRET_KEYS.includes(name) ? mask(overrides[name]) : overrides[name];
  }
  if (SECRET_KEYS.includes(name) && !context.user) {
    return null;
  }
  return findSetting(setting, name) ?? null;
};

const toBoolean = (value: string | null): boolean =>
  value !== null && ['1', 'true', 'yes'].includes(value.trim().toLowerCase());

export default {
  Setting: {
    // Provider selection: the saved setting wins, config is the fallback —
    // the inverse of the credential fields, where config/env pin the value.
    fileStorage: (setting: SettingRow[]) =>
      findSetting(setting, 'fileStorage') ||
      getConfig('system.file_storage', 'local'),
    s3Region: (setting: SettingRow[], _: unknown, context: GraphQLContext) =>
      effectiveValue(setting, 's3Region', context),
    s3Bucket: (setting: SettingRow[], _: unknown, context: GraphQLContext) =>
      effectiveValue(setting, 's3Bucket', context),
    s3AccessKeyId: (
      setting: SettingRow[],
      _: unknown,
      context: GraphQLContext
    ) => effectiveValue(setting, 's3AccessKeyId', context),
    s3SecretAccessKey: (
      setting: SettingRow[],
      _: unknown,
      context: GraphQLContext
    ) => effectiveValue(setting, 's3SecretAccessKey', context),
    s3Endpoint: (setting: SettingRow[], _: unknown, context: GraphQLContext) =>
      effectiveValue(setting, 's3Endpoint', context),
    s3ForcePathStyle: (
      setting: SettingRow[],
      _: unknown,
      context: GraphQLContext
    ) => toBoolean(effectiveValue(setting, 's3ForcePathStyle', context)),
    s3BaseUrl: (setting: SettingRow[], _: unknown, context: GraphQLContext) =>
      effectiveValue(setting, 's3BaseUrl', context),
    azureStorageConnectionString: (
      setting: SettingRow[],
      _: unknown,
      context: GraphQLContext
    ) => effectiveValue(setting, 'azureStorageConnectionString', context),
    azureStorageContainerName: (
      setting: SettingRow[],
      _: unknown,
      context: GraphQLContext
    ) =>
      effectiveValue(setting, 'azureStorageContainerName', context) || 'images',
    azureContainerAccess: (
      setting: SettingRow[],
      _: unknown,
      context: GraphQLContext
    ) =>
      effectiveValue(setting, 'azureContainerAccess', context) === 'blob'
        ? 'blob'
        : 'private',
    azureBaseUrl: (
      setting: SettingRow[],
      _: unknown,
      context: GraphQLContext
    ) => effectiveValue(setting, 'azureBaseUrl', context),
    gcsBucket: (setting: SettingRow[], _: unknown, context: GraphQLContext) =>
      effectiveValue(setting, 'gcsBucket', context),
    gcsServiceAccountKey: (
      setting: SettingRow[],
      _: unknown,
      context: GraphQLContext
    ) => effectiveValue(setting, 'gcsServiceAccountKey', context),
    gcsBaseUrl: (setting: SettingRow[], _: unknown, context: GraphQLContext) =>
      effectiveValue(setting, 'gcsBaseUrl', context),
    fileStorageConfigOverrides: () =>
      Object.keys(getFileStorageConfigOverrides())
  }
};
