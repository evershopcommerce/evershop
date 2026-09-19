import { FAINT, FONT, GROUND, INK, LINE, PANEL } from './tokens.js';

/**
 * The shared email chrome: doctype, head, hidden preheader, centered wrapper,
 * header (logo — bounded via prepareData), the content slot, and the footer
 * (store name + address + Visit store / Help). Every email renders its content
 * block into this via a Handlebars partial block:
 *
 *   {{#> emailLayout preheader=(t "…")}} …content… {{/emailLayout}}
 *
 * The content is emitted by `{{> @partial-block}}`. `@locale` is the render
 * locale from the data frame; `{{t}}` localizes the footer copy, so the chrome
 * translates with the rest.
 */
export const emailLayout = `<!DOCTYPE html>
<html lang="{{@locale}}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="x-apple-disable-message-reformatting">
{{#if storeInfo.logo}}<link rel="preload" as="image" href="{{storeInfo.logo.src}}">{{/if}}
</head>
<body style="margin:0;padding:0;background:${GROUND};font-family:${FONT};">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">{{preheader}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GROUND};">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${PANEL};border:1px solid ${LINE};border-radius:10px;">
<tr><td style="padding:32px 40px 4px;">
{{#if storeInfo.logo}}<img src="{{storeInfo.logo.src}}" alt="{{storeInfo.logo.alt}}" width="{{storeInfo.logo.width}}" height="{{storeInfo.logo.height}}" style="display:block;border:0;outline:none;text-decoration:none;max-width:100%;height:auto;">{{else}}<div style="font-family:${FONT};font-size:16px;font-weight:700;letter-spacing:0.02em;color:${INK};">{{storeInfo.storeName}}</div>{{/if}}
</td></tr>
<tr><td style="padding:22px 40px 10px;font-family:${FONT};font-size:15px;line-height:1.62;color:${INK};">
{{> @partial-block}}
</td></tr>
<tr><td style="padding:20px 40px 32px;border-top:1px solid ${LINE};">
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${FAINT};">{{storeInfo.storeName}}{{#if storeInfo.address.street}} &middot; {{storeInfo.address.street}}{{#if storeInfo.address.city}}, {{storeInfo.address.city}}{{/if}}{{#if storeInfo.address.province}}, {{storeInfo.address.province}}{{/if}}{{#if storeInfo.address.postalCode}} {{storeInfo.address.postalCode}}{{/if}}{{#if storeInfo.address.country}}, {{storeInfo.address.country}}{{/if}}{{/if}}</p>
<p style="margin:6px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${FAINT};"><a href="{{storeInfo.homeUrl}}" style="color:${FAINT};text-decoration:underline;">{{t "Visit store"}}</a>{{#if storeInfo.storeEmail}} &middot; <a href="mailto:{{storeInfo.storeEmail}}" style="color:${FAINT};text-decoration:underline;">{{t "Help"}}</a>{{/if}}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
