import { getConfig } from '../../../../../lib/util/getConfig.js';
import { SELECTABLE_MIME_TYPES } from '../../../services/getMulter.js';

type SettingRow = { name: string; value: string };
type OverrideRow = { type: string; maxSize: number };

const toPositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toOverrideRows = (value: unknown): OverrideRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((row) => ({
      type: String((row as OverrideRow)?.type || ''),
      maxSize: toPositiveNumber((row as OverrideRow)?.maxSize)
    }))
    .filter((row): row is OverrideRow => Boolean(row.type) && row.maxSize !== null);
};

export default {
  Setting: {
    uploadMaxFileSize: (setting: SettingRow[]) => {
      const pinned = getConfig('system.upload_max_file_size');
      if (pinned !== undefined) {
        return toPositiveNumber(pinned);
      }
      const row = setting.find((s) => s.name === 'uploadMaxFileSize');
      return toPositiveNumber(row?.value);
    },
    uploadMaxFileSizePinned: () =>
      getConfig('system.upload_max_file_size') !== undefined,
    uploadMaxFileSizePerType: (setting: SettingRow[]) => {
      const pinned = getConfig('system.upload_max_file_size_per_type');
      if (pinned !== undefined) {
        return Object.entries(pinned || {})
          .map(([type, maxSize]) => ({
            type,
            maxSize: toPositiveNumber(maxSize)
          }))
          .filter((row): row is OverrideRow => row.maxSize !== null);
      }
      const row = setting.find((s) => s.name === 'uploadMaxFileSizePerType');
      if (!row) {
        return [];
      }
      try {
        return toOverrideRows(JSON.parse(row.value));
      } catch {
        return [];
      }
    },
    uploadMaxFileSizePerTypePinned: () =>
      getConfig('system.upload_max_file_size_per_type') !== undefined,
    uploadAllowedMimeTypes: (setting: SettingRow[]) => {
      const row = setting.find((s) => s.name === 'uploadAllowedMimeTypes');
      if (!row) {
        return [];
      }
      const selectable = SELECTABLE_MIME_TYPES.map((option) => option.value);
      try {
        const saved = JSON.parse(row.value);
        return (Array.isArray(saved) ? saved : []).filter((type) =>
          selectable.includes(String(type).toLowerCase())
        );
      } catch {
        return [];
      }
    },
    uploadMimeTypeOptions: () => SELECTABLE_MIME_TYPES,
    uploadAllowedMimeTypesConfigExtras: () => {
      const extras = getConfig('system.upload_allowed_mime_types', []);
      return Array.isArray(extras) ? extras : [];
    }
  }
};
