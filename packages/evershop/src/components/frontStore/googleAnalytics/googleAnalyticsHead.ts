/**
 * Google Analytics 4 in the storefront page head: the script that
 * `modules/base/pages/frontStore/all/GoogleAnalyticsHead.tsx` (a `head` area
 * component) renders, only when the store has a valid Measurement ID
 * (setting `gaMeasurementId`): a store without one loads and runs nothing.
 *
 * One inline script, in the order Google's Consent Mode needs: `dataLayer`
 * and `gtag()`, the consent default (setting `gaConsentDefault`), `config`
 * (which sends the page view), then the gtag.js loader. `gtag()` exists
 * before the page bundle, whose listener
 * (`modules/base/pages/frontStore/all/GoogleAnalytics.tsx`) sends the
 * commerce events.
 */
export const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

/**
 * granted: no consent command, so GA4 collects from the first page. denied:
 * analytics and ads storage stay denied until a cookie banner sends Google's
 * consent update. Google still receives cookieless pings before that
 * (Google's advanced consent mode).
 */
export type GaConsentDefault = 'granted' | 'denied';

export const isGa4MeasurementId = (value: unknown): value is string =>
  typeof value === 'string' && GA4_MEASUREMENT_ID_PATTERN.test(value);

/**
 * The stored setting as a consent default: 'denied' in any case or with
 * spaces around it (a value saved through the API or by SQL) is 'denied',
 * anything else 'granted'
 */
export const toGaConsentDefault = (value: unknown): GaConsentDefault =>
  typeof value === 'string' && value.trim().toLowerCase() === 'denied'
    ? 'denied'
    : 'granted';

/**
 * The head script, or '' without a valid Measurement ID. The id is written
 * into the script: the pattern allows letters, digits and the dash only.
 */
export function googleAnalyticsHeadScript(
  measurementId: unknown,
  consentDefault: unknown
): string {
  if (!isGa4MeasurementId(measurementId)) {
    return '';
  }
  // Google serves a gtag.js that collects nothing for a lower-case id
  const id = measurementId.toUpperCase();
  // Only when no script before this one (a cookie banner) has set a consent
  // default: of two defaults Google keeps the later one, which would replace
  // the banner's regions, grants and wait time. gtag() pushes `arguments`;
  // gtag.js ignores a command pushed as an array. 500 ms gives a banner that
  // loads asynchronously the time to send its update.
  const consent =
    toGaConsentDefault(consentDefault) === 'denied'
      ? 'if(!dataLayer.some(function(a){' +
        "return Object.prototype.toString.call(a)==='[object Arguments]'" +
        "&&a[0]==='consent'&&a[1]==='default';}))" +
        "{gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied'," +
        "ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});}"
      : '';
  return (
    'window.dataLayer=window.dataLayer||[];' +
    'function gtag(){dataLayer.push(arguments);}' +
    consent +
    "gtag('js',new Date());" +
    `gtag('config','${id}');` +
    // A theme's copy of the GoogleAnalytics component from before this script
    // loads GA itself unless this flag holds the setting's id
    `window.__evershopGaLoaded='${measurementId}';` +
    "(function(){var s=document.createElement('script');s.async=true;" +
    `s.src='https://www.googletagmanager.com/gtag/js?id=${id}';` +
    'document.head.appendChild(s);})();'
  );
}
