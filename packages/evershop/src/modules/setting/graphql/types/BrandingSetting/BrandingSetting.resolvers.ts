import { Setting } from '../../../services/setting.js';

/**
 * Read a single `setting` row value from the rows array resolved by
 * `Query.setting`, coercing the empty string (a cleared field) to `null` so the
 * storefront falls back instead of rendering an empty src / blank tracking id.
 */
function readValue(setting: Setting[], name: string): string | null {
  const row = setting.find((s) => s.name === name);
  const value = row?.value;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export default {
  Setting: {
    logo: (setting: Setting[]) => readValue(setting, 'logo'),
    logoWidth: (setting: Setting[]) => readValue(setting, 'logoWidth'),
    logoHeight: (setting: Setting[]) => readValue(setting, 'logoHeight'),
    favicon: (setting: Setting[]) => readValue(setting, 'favicon'),
    socialSharingImage: (setting: Setting[]) =>
      readValue(setting, 'socialSharingImage'),
    gaMeasurementId: (setting: Setting[]) =>
      readValue(setting, 'gaMeasurementId')
  }
};
