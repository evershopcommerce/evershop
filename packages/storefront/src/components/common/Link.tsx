/* eslint-disable no-console */
import React from 'react';

/**
 * Valid values for the crossorigin attribute based on MDN specification
 */
export type CrossOrigin = 'anonymous' | 'use-credentials';

/**
 * Valid values for the fetchpriority attribute
 */
export type FetchPriority = 'high' | 'low' | 'auto';

/**
 * Valid values for the referrerpolicy attribute
 */
export type ReferrerPolicy =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

/**
 * Valid values for the as attribute when used with preload/modulepreload
 */
export type AsType =
  | 'audio'
  | 'document'
  | 'embed'
  | 'fetch'
  | 'font'
  | 'image'
  | 'object'
  | 'script'
  | 'style'
  | 'track'
  | 'video'
  | 'worker';

/**
 * Valid values for the blocking attribute
 */
export type BlockingType = 'render';

/**
 * Complete props interface for the Link component
 */
export interface LinkProps
  extends Omit<
    React.LinkHTMLAttributes<HTMLLinkElement>,
    'as' | 'crossOrigin' | 'fetchPriority' | 'referrerPolicy'
  > {
  href: string;
  rel: string;
  as?: AsType;
  blocking?: BlockingType;
  crossOrigin?: CrossOrigin;
  disabled?: boolean;
  fetchPriority?: FetchPriority;
  hrefLang?: string;
  imageSizes?: string;
  imageSrcSet?: string;
  integrity?: string;
  media?: string;
  referrerPolicy?: ReferrerPolicy;
  sizes?: string;
  title?: string;
  type?: string;
}

/**
 * Validates that required props are present based on rel value
 */
const validateProps = (props: LinkProps): void => {
  if (process.env.NODE_ENV === 'development') {
    const { rel, as: asType, crossOrigin, href } = props;

    // Check for 'as' attribute requirement with preload
    if (rel === 'preload' && !asType) {
      console.warn('Link: The "as" attribute is required when rel="preload"');
    }

    // Check for crossOrigin requirement with certain as values
    if (asType && ['fetch', 'font'].includes(asType) && !crossOrigin) {
      console.warn(
        `Link: The "crossOrigin" attribute is required when as="${asType}"`
      );
    }

    // Validate href is a proper URL format
    if (href && !href.match(/^(https?:\/\/|\/|\.\/|\.\.\/|\w+:)/)) {
      console.warn(
        `Link: Invalid href format "${href}". Expected a valid URL or path.`
      );
    }
  }
};

/**
 * Link component that renders an HTML <link> element with comprehensive HTML5 support.
 *
 * This component supports all standard HTML5 link element attributes including:
 * - Resource linking (stylesheets, icons, etc.)
 * - Preloading resources with rel="preload"
 * - Module preloading with rel="modulepreload"
 * - CORS handling with crossOrigin
 * - Security features like Subresource Integrity
 * - Performance hints with fetchPriority
 * - Media queries for conditional loading
 * - All modern web standards compliance
 *
 * @example
 * // Basic stylesheet
 * <Link rel="stylesheet" href="/styles.css" />
 *
 * @example
 * // Preload font with CORS
 * <Link
 *   rel="preload"
 *   as="font"
 *   href="/fonts/main.woff2"
 *   type="font/woff2"
 *   crossOrigin="anonymous"
 * />
 *
 * @example
 * // Responsive stylesheet with media query
 * <Link
 *   rel="stylesheet"
 *   href="/mobile.css"
 *   media="screen and (max-width: 600px)"
 * />
 *
 * @example
 * // Icon with sizes
 * <Link
 *   rel="apple-touch-icon"
 *   sizes="180x180"
 *   href="/apple-touch-icon.png"
 * />
 */
export function Link(props: LinkProps): React.ReactElement {
  const {
    href,
    rel,
    as: asType,
    blocking,
    crossOrigin,
    disabled,
    fetchPriority,
    hrefLang,
    imageSizes,
    imageSrcSet,
    integrity,
    media,
    referrerPolicy,
    sizes,
    title,
    type,
    ...otherProps
  } = props;

  // Validate props in development
  validateProps(props);

  // Build props object with only defined attributes
  const linkProps: Record<string, any> = {
    href,
    rel,
    ...otherProps
  };

  // Add optional attributes only if they are defined
  if (asType !== undefined) linkProps.as = asType;
  if (blocking !== undefined) linkProps.blocking = blocking;
  if (crossOrigin !== undefined) linkProps.crossOrigin = crossOrigin;
  if (disabled !== undefined) linkProps.disabled = disabled;
  if (fetchPriority !== undefined) linkProps.fetchPriority = fetchPriority;
  if (hrefLang !== undefined) linkProps.hrefLang = hrefLang;
  if (imageSizes !== undefined) linkProps.imageSizes = imageSizes;
  if (imageSrcSet !== undefined) linkProps.imageSrcSet = imageSrcSet;
  if (integrity !== undefined) linkProps.integrity = integrity;
  if (media !== undefined) linkProps.media = media;
  if (referrerPolicy !== undefined) linkProps.referrerPolicy = referrerPolicy;
  if (sizes !== undefined) linkProps.sizes = sizes;
  if (title !== undefined) linkProps.title = title;
  if (type !== undefined) linkProps.type = type;

  return <link {...linkProps} />;
}

/**
 * Convenience component for stylesheet links
 */
export function Stylesheet({
  href,
  media,
  title,
  disabled,
  integrity,
  crossOrigin,
  fetchPriority,
  ...props
}: Omit<LinkProps, 'rel'> & {
  media?: string;
  title?: string;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <Link
      rel="stylesheet"
      href={href}
      media={media}
      title={title}
      disabled={disabled}
      integrity={integrity}
      crossOrigin={crossOrigin}
      fetchPriority={fetchPriority}
      {...props}
    />
  );
}

/**
 * Convenience component for favicon links
 */
export function Favicon({
  href,
  sizes,
  type = 'image/x-icon',
  ...props
}: Omit<LinkProps, 'rel'> & {
  sizes?: string;
  type?: string;
}): React.ReactElement {
  return <Link rel="icon" href={href} sizes={sizes} type={type} {...props} />;
}

/**
 * Convenience component for Apple Touch Icon links
 */
export function AppleTouchIcon({
  href,
  sizes,
  type = 'image/png',
  ...props
}: Omit<LinkProps, 'rel'> & {
  sizes?: string;
  type?: string;
}): React.ReactElement {
  return (
    <Link
      rel="apple-touch-icon"
      href={href}
      sizes={sizes}
      type={type}
      {...props}
    />
  );
}

/**
 * Convenience component for resource preloading
 */
export function Preload({
  href,
  as,
  type,
  crossOrigin,
  integrity,
  fetchPriority,
  media,
  imageSizes,
  imageSrcSet,
  ...props
}: Omit<LinkProps, 'rel'> & {
  as: AsType;
  type?: string;
  crossOrigin?: CrossOrigin;
  integrity?: string;
  fetchPriority?: FetchPriority;
  media?: string;
  imageSizes?: string;
  imageSrcSet?: string;
}): React.ReactElement {
  return (
    <Link
      rel="preload"
      href={href}
      as={as}
      type={type}
      crossOrigin={crossOrigin}
      integrity={integrity}
      fetchPriority={fetchPriority}
      media={media}
      imageSizes={imageSizes}
      imageSrcSet={imageSrcSet}
      {...props}
    />
  );
}

/**
 * Convenience component for module preloading
 */
export function ModulePreload({
  href,
  as,
  integrity,
  fetchPriority,
  crossOrigin,
  ...props
}: Omit<LinkProps, 'rel'> & {
  as?: AsType;
  integrity?: string;
  fetchPriority?: FetchPriority;
  crossOrigin?: CrossOrigin;
}): React.ReactElement {
  return (
    <Link
      rel="modulepreload"
      href={href}
      as={as}
      integrity={integrity}
      fetchPriority={fetchPriority}
      crossOrigin={crossOrigin}
      {...props}
    />
  );
}

/**
 * Convenience component for DNS prefetch
 */
export function DNSPrefetch({
  href,
  ...props
}: Omit<LinkProps, 'rel'>): React.ReactElement {
  return <Link rel="dns-prefetch" href={href} {...props} />;
}

/**
 * Convenience component for preconnect
 */
export function Preconnect({
  href,
  crossOrigin,
  ...props
}: Omit<LinkProps, 'rel'> & { crossOrigin?: CrossOrigin }): React.ReactElement {
  return (
    <Link rel="preconnect" href={href} crossOrigin={crossOrigin} {...props} />
  );
}
