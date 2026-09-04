import type Handlebars from 'handlebars';
import { emailLayout } from './layout.js';
import { button, divider, itemsTable } from './partials.js';

type TranslateFn = (
  text: string,
  values?: Record<string, string>,
  locale?: string
) => string;

/**
 * Register the shared email layer on a Handlebars instance: the `{{t}}`
 * translation helper (backed by the injected `translate`) plus the `emailLayout`
 * partial and the shared content partials. Called once from emailHelper with the
 * global Handlebars + the real `translate`; tests call it on a fresh instance
 * with a stub, so the templates are verifiable without touching settings or the
 * DB.
 *
 * `{{t "Order #${'$'}{number}" number=order.order_number}}` — copy strings are the
 * English source keys; interpolation uses translate's `${'$'}{name}` syntax fed by
 * the helper hash. Hash values are coerced to strings (null/undefined → '') so a
 * missing name renders empty rather than the literal "undefined".
 */
export function registerEmailTemplates(
  hbs: typeof Handlebars,
  deps: { translate: TranslateFn }
): void {
  hbs.registerHelper('t', function (key: string, options: Handlebars.HelperOptions) {
    const hash = options?.hash ?? {};
    const values: Record<string, string> = {};
    for (const k of Object.keys(hash)) {
      values[k] = hash[k] == null ? '' : String(hash[k]);
    }
    return deps.translate(key, values, options?.data?.locale);
  });
  hbs.registerPartial('emailLayout', emailLayout);
  hbs.registerPartial('button', button);
  hbs.registerPartial('divider', divider);
  hbs.registerPartial('itemsTable', itemsTable);
}

export { emailLayout, button, divider, itemsTable };
