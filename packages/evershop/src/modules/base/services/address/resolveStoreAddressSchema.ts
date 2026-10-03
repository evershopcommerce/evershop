import { resolveAddressSchema } from '../../../../lib/address/derive.js';
import { resolveDefaultCountry } from '../../../../lib/address/settings.js';
import type {
  AddressSurface,
  ResolvedAddressSchema
} from '../../../../lib/address/types.js';
import { getActiveLocale } from '../../../../lib/locale/localeContext.js';
import { getSettingSync } from '../../../setting/services/setting.js';
import { getAddressSettings } from './getAddressSettings.js';

/**
 * The one entry point the GraphQL resolvers and the services use to resolve
 * an address schema on the server (spec § 3.4, D-02/D-20).
 *
 * - `country` absent or empty → the store's `defaultCountry` setting: `store`
 *   resolves the store country, a code resolves that code, `none` resolves
 *   the `DEFAULT` record with `country: ''`. `ResolvedAddressSchema.country`
 *   tells the caller what it got.
 * - `locale` absent → the active request locale (store default off-request).
 * - The merchant settings and the `addressSchema` processor hook apply on
 *   every call; only record → derived schema is cached (`derive.ts`).
 */
export function resolveStoreAddressSchema(
  country?: string | null,
  locale?: string | null,
  surface?: AddressSurface
): ResolvedAddressSchema {
  const settings = getAddressSettings();
  const requested = typeof country === 'string' ? country.trim() : '';
  const cc =
    requested !== ''
      ? requested
      : resolveDefaultCountry(
          settings,
          getSettingSync<string | undefined>('storeCountry', undefined) ?? undefined
        );
  return resolveAddressSchema(cc, locale ?? getActiveLocale(), {
    surface,
    settings,
    applyHook: true
  });
}
