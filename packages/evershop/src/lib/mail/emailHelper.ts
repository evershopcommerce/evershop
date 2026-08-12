import Handlebars from 'handlebars';
import {
  getSetting,
  getStoreCurrency,
  getStoreLanguage
} from '../../modules/setting/services/setting.js';
import { countries } from '../locale/countries.js';
import { provinces } from '../locale/provinces.js';
import { getBaseUrl } from '../util/getBaseUrl.js';
import { getConfig } from '../util/getConfig.js';
import { addProcessor, getValue, getValueSync } from '../util/registry.js';

/**
 * A locale string `Intl.*` will accept. Malformed tags — the underscore form (`en_US`),
 * a stray `translations/` folder name, a single char — make `Intl.NumberFormat`/
 * `DateTimeFormat` throw `RangeError`, which inside a Handlebars helper aborts the whole
 * email render and silently drops the message. Validate once; fall back to the config
 * language, then `'en'` (always valid). (P7b — the currency helper was throw-proof when
 * it hardcoded `'en-US'`; resolving the locale dynamically reintroduced the risk.)
 */
function safeLocale(candidate: unknown): string {
  const locale =
    (typeof candidate === 'string' && candidate) ||
    getConfig('shop.language', 'en');
  try {
    Intl.getCanonicalLocales(locale);
    return locale;
  } catch {
    return 'en';
  }
}

Handlebars.registerHelper('currency', function (value) {
  if (value == null) return '';

  const number = Number(value);

  // Handlebars always passes its options hash as the last argument; the per-render
  // locale is injected via the `data` frame in buildEmailBodyFromTemplate. Falls back
  // to the config language (was a hardcoded 'en-US' — P7b).
  const options = arguments[arguments.length - 1];
  const locale = safeLocale(options?.data?.locale);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: getStoreCurrency(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(number);
});

Handlebars.registerHelper('date', function (value, format = 'MMM DD, YYYY') {
  if (!value) return '';

  let date;

  // handle seconds vs milliseconds
  if (typeof value === 'number' || /^\d+$/.test(value)) {
    const ts = Number(value);
    date = new Date(ts < 1e12 ? ts * 1000 : ts);
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) return '';

  // Same per-render locale as the currency helper (was config-only).
  const options = arguments[arguments.length - 1];
  const locale = safeLocale(options?.data?.locale);

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date);
});

export type SendEmailArguments = {
  from?: string;
  to: string;
  subject: string;
  body?: string;
  template: string;
  data: EmailData;
  /**
   * Locale to render this email in (subject is translated by the caller; this drives the
   * body's currency/date formatting). Off-request (D7) there is no ALS locale, so callers
   * resolve it explicitly. Defaults to `getStoreLanguage()` when omitted. Forward-compat:
   * a caller can pass an order/customer's preferred locale once that is persisted.
   */
  locale?: string;
  [key: string]: unknown;
};

/**
 * Validates email arguments to ensure they meet the required format.
 * @param args - The arguments to validate
 * @throws Will throw an error if validation fails
 */
export function validateSendEmailArguments(
  args: unknown
): asserts args is SendEmailArguments {
  // Validate args is an object
  if (typeof args !== 'object' || args === null) {
    throw new Error('Email arguments must be an object.');
  }

  const typedArgs = args as Record<string, unknown>;

  // Validate required fields exist and are non-empty strings
  if (typeof typedArgs.to !== 'string' || typedArgs.to.trim() === '') {
    throw new Error('"to" field must be a non-empty string.');
  }

  if (
    typeof typedArgs.subject !== 'string' ||
    typedArgs.subject.trim() === ''
  ) {
    throw new Error('"subject" field must be a non-empty string.');
  }

  if (
    typeof typedArgs.template !== 'string' ||
    typedArgs.template.trim() === ''
  ) {
    throw new Error('"template" field must be a non-empty string.');
  }
  // Body is optional, but it must be a string if provided
  if (
    typedArgs.body !== undefined &&
    (typeof typedArgs.body !== 'string' || typedArgs.body.trim() === '')
  ) {
    throw new Error('"body" field must be a non-empty string if provided.');
  }

  // Validate optional fields if present
  if (
    typedArgs.template !== undefined &&
    typeof typedArgs.template !== 'string'
  ) {
    throw new Error('"template" field must be a string if provided.');
  }

  if (typedArgs.cc !== undefined && !Array.isArray(typedArgs.cc)) {
    throw new Error('"cc" field must be an array if provided.');
  }

  // Validate cc array contains only strings
  if (Array.isArray(typedArgs.cc)) {
    if (!typedArgs.cc.every((email) => typeof email === 'string')) {
      throw new Error('"cc" array must contain only strings.');
    }
  }
}

export interface EmailService {
  sendEmail: (args: SendEmailArguments) => Promise<void>;
}

/**
 * Validates if the given service implements the EmailService interface.
 * @param service - The service to validate
 * @returns True if valid, false otherwise
 */
function isValidEmailService(service: unknown): service is EmailService {
  return (
    typeof service === 'object' &&
    service !== null &&
    'sendEmail' in service &&
    typeof (service as EmailService).sendEmail === 'function'
  );
}

/**
 * Retrieves the registered email service from the registry.
 * @returns The email service object.
 */
export function getEmailService(): EmailService | undefined {
  const emailService = getValueSync<EmailService | undefined>(
    'emailService',
    undefined,
    {},
    isValidEmailService
  );
  return emailService;
}

/** Registers a new email service.
 * @param service - The email service to register.
 * @throws Will throw an error if the service does not implement the EmailService interface.
 */
export function registerEmailService(service: EmailService): void {
  if (!isValidEmailService(service)) {
    throw new Error(
      'Invalid email service. It must be an object with a sendEmail method.'
    );
  }
  addProcessor('emailService', () => {
    return service;
  });
}

/**
 * Sends an email using the registered email service.
 * @param id - The identifier for the email type, e.g., 'order_confirmation'
 * @param args - The email arguments
 * @returns A promise that resolves when the email is sent.
 */
export async function sendEmail(
  id: string,
  args: SendEmailArguments
): Promise<void> {
  const emailService = getEmailService();
  if (!emailService) {
    return Promise.reject(
      new Error('No email service registered to send emails.')
    );
  }
  const finalArgs = await getValue('emailArguments', args, { id });
  if (!finalArgs?.from) {
    finalArgs.from = getConfig('system.notification_emails.from', undefined);
  }
  validateSendEmailArguments(finalArgs);
  if (!finalArgs.body) {
    // Off-request renders have no ALS locale (D7): use the caller-supplied locale, else
    // the store default. Drives the currency/date helpers in the template.
    const locale = finalArgs.locale ?? (await getStoreLanguage());
    const body = await buildEmailBodyFromTemplate(
      finalArgs.template,
      finalArgs.data || {},
      locale
    );
    finalArgs.body = body;
  }
  return await emailService.sendEmail(finalArgs);
}

export interface EmailData {
  storeInfo?: {
    logo?: {
      src?: string;
      alt?: string;
      height?: string;
      width?: string;
    };
    storeName: string;
    storeEmail: string;
    storeDescription: string;
    phone: string;
    homeUrl: string;
    address: {
      country?: string;
      province?: string;
      city?: string;
      street?: string;
      postalCode?: string;
    };
  };
  [key: string]: unknown;
}
/**
 * Builds email body from a template by replacing placeholders with actual data.
 * @param template - The email template string with placeholders in {{key}} format.
 * @param data - An object containing key-value pairs to replace in the template.
 * @returns The final email body string with placeholders replaced by actual data.
 */
export async function buildEmailBodyFromTemplate(
  template: string,
  data: EmailData,
  locale?: string
): Promise<string> {
  try {
    const preparedData = await prepareData(data);
    // Pass the locale through Handlebars' private `data` frame so the currency/date
    // helpers can read it (`options.data.locale`) without polluting the template context.
    const body = Handlebars.compile(template)(preparedData, {
      data: { locale: locale || getConfig('shop.language', 'en') }
    });
    return body;
  } catch (error) {
    throw new Error(`Failed to build email body from template: ${error}`);
  }
}

/** Prepares email data by adding store information and processing through registry.
 * @param data - The initial email data.
 * @returns The prepared email data with store information.
 */
async function prepareData(data: EmailData): Promise<EmailData> {
  // The logo is an admin setting (Store Setting → Branding). The email needs an
  // ABSOLUTE, email-safe image, so it is served through the /images endpoint as a
  // sized PNG (WebP/AVIF are unreliable in Outlook and older mail clients). When
  // unset, `logo` stays undefined and each template's {{#if storeInfo.logo}} skips it.
  const logoSetting = await getSetting<string>('logo', '');
  const logo = logoSetting
    ? {
        src: `${getBaseUrl()}/images?src=${encodeURIComponent(
          logoSetting
        )}&w=360&q=85&f=png`,
        alt: await getSetting('storeName', 'Evershop'),
        // Display width only (2× source for crisp retina); height stays auto.
        width: '180'
      }
    : undefined;
  const addressCountry = await getSetting('storeCountry', 'US');
  const addressProvince = await getSetting('storeProvince', '');
  const addressCity = await getSetting('storeCity', '');
  const addressStreet = await getSetting('storeAddress', '');
  const addressPostalCode = await getSetting('storePostalCode', '');
  const storeInformation = {
    logo,
    storeName: await getSetting('storeName', 'Evershop'),
    storeEmail: await getSetting('storeEmail', ''),
    storeDescription: await getSetting('storeDescription', ''),
    phone: await getSetting('storePhoneNumber', ''),
    homeUrl: getBaseUrl(),
    address: {
      country: countries.find((c) => c.code === addressCountry)?.name,
      province: provinces.find((p) => p.code === addressProvince)?.name,
      city: addressCity,
      street: addressStreet,
      postalCode: addressPostalCode
    }
  };
  data.storeInfo = storeInformation;
  const finalData = await getValue('emailTemplateData', data, {});
  return finalData;
}
