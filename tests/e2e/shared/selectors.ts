/**
 * Stable selectors used across specs. Centralised so a single class
 * rename only changes one file. Conventions:
 *
 *   - Page-builder editor chrome (topbar, sidebar tabs, drawer): use
 *     `[data-testid]` attributes when they exist, otherwise fall back to
 *     `role` + accessible-name selectors.
 *   - Storefront widget output: use the BEM classes (`evershop-<widget>__*`)
 *     we just added in this branch. They were specifically introduced so
 *     third parties — and now tests — can target structural elements
 *     without fighting Tailwind utility class churn.
 *
 * Add new entries here as specs need them. Don't inline selectors in
 * specs — that's how brittle suites are born.
 */

/** Page-builder editor — top-level chrome */
export const editor = {
  /** Outer flex container (`<div class="page-builder-editor ...">`). */
  root: '.page-builder-editor',
  /**
   * Topbar header — the editor's own `<header>` direct child of the
   * outer container. The direct-child (`>`) is important: the
   * SessionPicker dialog renders its OWN `<header>` inside the editor
   * tree, and a `.page-builder-editor header` selector would match
   * both and trigger strict-mode violations.
   */
  topbar: '.page-builder-editor > header',
  /** Left sidebar with Widgets / Pages / Layers / Settings tabs. */
  sidebar: '.page-builder-editor aside',
  /** The storefront preview iframe (single iframe in the editor). */
  iframe: '.page-builder-editor iframe'
} as const;

/** Session picker (mounted on editor entry; dismiss to reach the canvas) */
export const sessionPicker = {
  /** The modal dialog itself (role="dialog" aria-labelledby="session-picker-title"). */
  dialog: '[role="dialog"][aria-labelledby="session-picker-title"]',
  /** Title text, useful for `expect(...).toBeVisible()`. */
  title: 'Start a page-builder session'
} as const;

/** Storefront widget root classes (BEM) */
export const widgetRoot = {
  banner: '.evershop-banner',
  announcementBar: '.evershop-announcement-bar',
  basicMenu: '.evershop-basic-menu',
  bentoGrid: '.evershop-bento-grid',
  brandStory: '.evershop-brand-story',
  categoryMosaic: '.evershop-category-mosaic',
  columns: '.evershop-columns',
  couponBlock: '.evershop-coupon-block',
  faqBlock: '.evershop-faq-block',
  section: '.evershop-section',
  separator: '.evershop-separator',
  slideshow: '.evershop-slideshow',
  splitFeature: '.evershop-split-feature',
  textBlock: '.evershop-text-block',
  tieredCategories: '.evershop-tiered-categories',
  trustStrip: '.evershop-trust-strip',
  collectionProducts: '.evershop-collection-products',
  collectionSpotlight: '.evershop-collection-spotlight',
  collectionStack: '.evershop-collection-stack',
  productHero: '.evershop-product-hero'
} as const;
