import { FONT, INK, LINE, MUTED } from './tokens.js';

/**
 * Bulletproof button. Called as `{{> button href=… label=…}}`; the accent color
 * comes from the store's brand token (`@root.brand.accentColor`, injected by
 * prepareData), so the layout never hardcodes a brand color.
 */
export const button = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 6px;"><tr><td style="border-radius:6px;background:{{@root.brand.accentColor}};"><a href="{{href}}" target="_blank" style="display:inline-block;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:6px;">{{label}}</a></td></tr></table>`;

/** A hairline rule. */
export const divider = `<div style="height:1px;line-height:1px;font-size:0;background:${LINE};margin:22px 0;">&nbsp;</div>`;

/**
 * Order line items with a bounded thumbnail (48×48 — the img width/height caps
 * the display so a large product photo can't break the row, the same lesson as
 * the logo). Iterates `order.items`; each item has `thumbnail` (resolved
 * absolute URL), `product_name`, `qty`, and `final_price`.
 */
export const itemsTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0;">{{#each order.items}}<tr><td width="60" style="padding:12px 14px 12px 0;border-bottom:1px solid ${LINE};vertical-align:top;">{{#if this.thumbnail}}<img src="{{this.thumbnail}}" alt="{{this.product_name}}" width="48" height="48" style="display:block;border:1px solid ${LINE};border-radius:6px;outline:none;">{{/if}}</td><td style="padding:12px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:14px;line-height:1.4;color:${INK};vertical-align:top;">{{this.product_name}}<br><span style="color:${MUTED};font-size:13px;">{{t "Qty"}} {{this.qty}}</span></td><td style="padding:12px 0;border-bottom:1px solid ${LINE};font-family:${FONT};font-size:14px;color:${INK};text-align:right;white-space:nowrap;vertical-align:top;">{{currency this.final_price}}</td></tr>{{/each}}</table>`;
