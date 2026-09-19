import multer from 'multer';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getSettingSync } from '../../setting/services/setting.js';
import customMemoryStorage from './CustomMemoryStorage.js';
import { generateFileName } from './generateFileName.js';

/**
 * Built-in allowed upload types. SVG is deliberately absent — SVGs can carry
 * scripts and are an XSS vector when served.
 */
export const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/apng'
];

export const DEFAULT_MAX_FILE_SIZE_MB = 10;

/**
 * The curated catalog the admin can pick allowed types from (System Setting →
 * File Uploads). Deliberately absent: `image/svg+xml` (SVGs can carry scripts
 * — an XSS vector when served) and anything script-like or executable. The
 * runtime intersects the saved selection with this catalog, so a type outside
 * it can never take effect even if written to the settings table directly.
 */
export const SELECTABLE_MIME_TYPES = [
  { value: 'image/jpeg', label: 'JPEG (image/jpeg)' },
  { value: 'image/png', label: 'PNG (image/png)' },
  { value: 'image/gif', label: 'GIF (image/gif)' },
  { value: 'image/webp', label: 'WebP (image/webp)' },
  { value: 'image/avif', label: 'AVIF (image/avif)' },
  { value: 'image/apng', label: 'APNG (image/apng)' },
  { value: 'application/pdf', label: 'PDF (application/pdf)' },
  { value: 'video/mp4', label: 'MP4 video (video/mp4)' },
  { value: 'video/webm', label: 'WebM video (video/webm)' },
  { value: 'video/quicktime', label: 'QuickTime video (video/quicktime)' },
  { value: 'audio/mpeg', label: 'MP3 audio (audio/mpeg)' },
  { value: 'audio/ogg', label: 'OGG audio (audio/ogg)' },
  { value: 'audio/wav', label: 'WAV audio (audio/wav)' },
  { value: 'application/zip', label: 'ZIP archive (application/zip)' }
];

/** `type/subtype` or a family wildcard `type/*` */
const MIME_PATTERN = /^[a-z0-9.+-]+\/(\*|[a-z0-9.+-]+)$/i;

/**
 * The admin's saved type selection, intersected with the catalog. Empty when
 * nothing (valid) is saved.
 */
export function getSelectedMimeTypes() {
  const selectable = SELECTABLE_MIME_TYPES.map((option) => option.value);
  const saved = getSettingSync('uploadAllowedMimeTypes', []);
  return (Array.isArray(saved) ? saved : [])
    .map((type) => String(type).trim().toLowerCase())
    .filter((type) => selectable.includes(type));
}

/**
 * The effective allowlist: the admin's selection from the catalog (falling
 * back to the built-in image types when nothing is selected), EXTENDED by
 * `system.upload_allowed_mime_types` — the config adds operator-level types
 * (it does not replace, and it is not limited to the catalog).
 */
export function getAllowedMimeTypes() {
  const selected = getSelectedMimeTypes();
  const base = selected.length > 0 ? selected : DEFAULT_ALLOWED_MIME_TYPES;
  const extra = getConfig('system.upload_allowed_mime_types', []);
  return [...new Set([...base, ...(Array.isArray(extra) ? extra : [])])];
}

/**
 * Master per-file upload size limit in megabytes. Precedence:
 * `system.upload_max_file_size` config (operator pin) → the admin setting
 * `uploadMaxFileSize` (System Setting page) → 10 MB. Invalid or non-positive
 * values fall back to the default.
 */
export function getMaxUploadFileSizeMb() {
  const pinned = getConfig('system.upload_max_file_size');
  const configured =
    pinned !== undefined ? pinned : getSettingSync('uploadMaxFileSize', '');
  const parsed = Number(configured);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_FILE_SIZE_MB;
}

const toPositiveMb = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * Per-type size overrides as a `{ pattern: MB }` map. Patterns are an exact
 * MIME type (`video/mp4`) or a family wildcard (`video/*`). Source: the
 * `system.upload_max_file_size_per_type` config map (operator pin — when
 * present it is authoritative) → the admin setting `uploadMaxFileSizePerType`
 * (a list of `{ type, maxSize }` rows). Invalid entries are dropped.
 */
export function getUploadSizeOverrides() {
  const pinned = getConfig('system.upload_max_file_size_per_type');
  const overrides = {};
  if (pinned !== undefined) {
    Object.entries(pinned || {}).forEach(([pattern, size]) => {
      const normalized = String(pattern).trim().toLowerCase();
      const mb = toPositiveMb(size);
      if (MIME_PATTERN.test(normalized) && mb !== undefined) {
        overrides[normalized] = mb;
      }
    });
    return overrides;
  }
  const rows = getSettingSync('uploadMaxFileSizePerType', []);
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const normalized = String(row?.type || '')
      .trim()
      .toLowerCase();
    const mb = toPositiveMb(row?.maxSize);
    if (MIME_PATTERN.test(normalized) && mb !== undefined) {
      overrides[normalized] = mb;
    }
  });
  return overrides;
}

/**
 * The limit that applies to one file: exact type override → family wildcard
 * override (`video/*`) → the master limit.
 */
export function getMaxUploadFileSizeMbForType(mimetype) {
  const overrides = getUploadSizeOverrides();
  const normalized = String(mimetype || '').toLowerCase();
  if (overrides[normalized] !== undefined) {
    return overrides[normalized];
  }
  const family = `${normalized.split('/')[0]}/*`;
  if (overrides[family] !== undefined) {
    return overrides[family];
  }
  return getMaxUploadFileSizeMb();
}

/**
 * The outer multer/busboy cap: the largest configured limit. Per-type
 * enforcement happens while the file streams into memory (CustomMemoryStorage)
 * — this cap only bounds the absolute worst case.
 */
export function getUploadHardCapMb() {
  return Math.max(
    getMaxUploadFileSizeMb(),
    ...Object.values(getUploadSizeOverrides())
  );
}

export function fileFilter(request, file, cb) {
  if (!getAllowedMimeTypes().includes(file.mimetype)) {
    return cb(new Error('The file you are trying to upload is not allowed'));
  } else {
    return cb(null, true);
  }
}

/**
 * Call per request — the size limits read live configuration, so a settings
 * save applies without restart.
 */
export const getMulter = () => {
  const memoryStorage = customMemoryStorage({
    filename: generateFileName,
    fileSizeLimitMb: (file) => getMaxUploadFileSizeMbForType(file.mimetype)
  });
  return multer({
    storage: memoryStorage,
    fileFilter,
    limits: {
      fileSize: Math.round(getUploadHardCapMb() * 1024 * 1024)
    }
  });
};
