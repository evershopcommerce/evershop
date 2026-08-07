/* eslint-disable no-console */
import React from 'react';

interface BaseMetaProps {
  charset?: string;
  content?: string;
  httpEquiv?:
    | 'content-type'
    | 'default-style'
    | 'refresh'
    | 'x-ua-compatible'
    | 'content-security-policy';
  lang?: string;
  scheme?: string;
  media?: string;
}

interface NameMetaProps extends BaseMetaProps {
  name:
    | 'description'
    | 'keywords'
    | 'author'
    | 'viewport'
    | 'robots'
    | 'generator'
    | 'theme-color'
    | 'application-name'
    | 'color-scheme'
    | 'referrer'
    | string;
  property?: never;
  itemProp?: never;
}

interface PropertyMetaProps extends BaseMetaProps {
  property: string;
  name?: never;
  itemProp?: never;
}

interface ItemPropMetaProps extends BaseMetaProps {
  itemProp: string;
  itemType?: string;
  itemId?: string;
  name?: never;
  property?: never;
  httpEquiv?: never;
}

interface HttpEquivMetaProps extends BaseMetaProps {
  httpEquiv:
    | 'content-type'
    | 'default-style'
    | 'refresh'
    | 'x-ua-compatible'
    | 'content-security-policy';
  content: string;
  name?: never;
  property?: never;
  itemProp?: never;
}

interface CharsetOnlyProps {
  charset: 'utf-8' | string;
  content?: never;
  name?: never;
  property?: never;
  itemProp?: never;
  httpEquiv?: never;
  lang?: never;
  scheme?: never;
  media?: never;
}

type MetaProps =
  | NameMetaProps
  | PropertyMetaProps
  | ItemPropMetaProps
  | HttpEquivMetaProps
  | CharsetOnlyProps;

const VALID_HTTP_EQUIV = [
  'content-type',
  'default-style',
  'refresh',
  'x-ua-compatible',
  'content-security-policy'
] as const;

const REQUIRED_CONTENT_ATTRIBUTES = [
  'name',
  'property',
  'itemProp',
  'httpEquiv'
] as const;

function validateMetaProps(props: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const hasIdentifier = [
    'name',
    'property',
    'itemProp',
    'httpEquiv',
    'charset'
  ].some((attr) => props[attr] !== undefined);

  if (!hasIdentifier) {
    errors.push(
      'Meta tag must have at least one identifier attribute (name, property, itemProp, httpEquiv, or charset)'
    );
  }

  if (props.charset && props.charset.toLowerCase() !== 'utf-8') {
    errors.push('charset attribute must be "utf-8" for HTML5 documents');
  }

  if (props.itemProp && (props.name || props.httpEquiv || props.charset)) {
    errors.push(
      'itemProp attribute cannot be used with name, http-equiv, or charset attributes'
    );
  }

  const needsContent = REQUIRED_CONTENT_ATTRIBUTES.some(
    (attr) => props[attr] !== undefined
  );
  if (needsContent && !props.content) {
    errors.push(
      'Meta tag with name, property, itemProp, or httpEquiv must have content attribute'
    );
  }

  if (props.media && props.name !== 'theme-color') {
    errors.push('media attribute is only valid when name="theme-color"');
  }

  if (props.httpEquiv && !VALID_HTTP_EQUIV.includes(props.httpEquiv)) {
    errors.push(
      `Invalid httpEquiv value: ${
        props.httpEquiv
      }. Valid values: ${VALID_HTTP_EQUIV.join(', ')}`
    );
  }

  const identifierCount = ['name', 'property', 'itemProp'].filter(
    (attr) => props[attr] !== undefined
  ).length;
  if (identifierCount > 1) {
    errors.push(
      'Meta tag cannot have multiple identifier attributes (name, property, itemProp)'
    );
  }

  if (props.itemProp) {
    if (props.itemType && !props.itemType.startsWith('http')) {
      errors.push('itemType should be a valid URL (typically schema.org URL)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function sanitizeMetaProps(props: any): Record<string, string> {
  const allowedAttributes = [
    'charset',
    'name',
    'content',
    'httpEquiv',
    'property',
    'itemProp',
    'itemType',
    'itemId',
    'lang',
    'scheme',
    'media'
  ];

  return Object.keys(props)
    .filter(
      (key) =>
        allowedAttributes.includes(key) &&
        props[key] !== undefined &&
        props[key] !== null
    )
    .reduce((obj, key) => {
      obj[key] = String(props[key]).trim();
      return obj;
    }, {} as Record<string, string>);
}

export function Meta(props: MetaProps) {
  if (process.env.NODE_ENV === 'development') {
    const validation = validateMetaProps(props);
    if (!validation.isValid) {
      console.error('Meta component validation errors:', validation.errors);
      validation.errors.forEach((error) => console.error(`Meta: ${error}`));
    }
  }

  const sanitizedProps = sanitizeMetaProps(props);

  if (Object.keys(sanitizedProps).length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Meta component has no valid attributes, not rendering');
    }
    return null;
  }

  return <meta {...sanitizedProps} />;
}

export function MetaCharset({ charset = 'utf-8' }: { charset?: string } = {}) {
  return <Meta charset={charset} />;
}

export function MetaDescription({ description }: { description: string }) {
  return <Meta name="description" content={description} />;
}

export function MetaKeywords({ keywords }: { keywords: string | string[] }) {
  const keywordString = Array.isArray(keywords)
    ? keywords.join(', ')
    : keywords;
  return <Meta name="keywords" content={keywordString} />;
}

export function MetaAuthor({ author }: { author: string }) {
  return <Meta name="author" content={author} />;
}

export function MetaThemeColor({
  color,
  media
}: {
  color: string;
  media?: string;
}) {
  return <Meta name="theme-color" content={color} media={media} />;
}

export function MetaViewport({
  width = 'device-width',
  initialScale = 1,
  maximumScale,
  userScalable = true
}: {
  width?: string | number;
  initialScale?: number;
  maximumScale?: number;
  userScalable?: boolean;
}) {
  const parts = [`width=${width}`, `initial-scale=${initialScale}`];

  if (maximumScale !== undefined) {
    parts.push(`maximum-scale=${maximumScale}`);
  }

  if (!userScalable) {
    parts.push('user-scalable=no');
  }

  return <Meta name="viewport" content={parts.join(', ')} />;
}

export function MetaHttpEquiv({
  httpEquiv,
  content
}: {
  httpEquiv:
    | 'content-type'
    | 'default-style'
    | 'refresh'
    | 'x-ua-compatible'
    | 'content-security-policy';
  content: string;
}) {
  return <Meta httpEquiv={httpEquiv} content={content} />;
}

export function MetaOpenGraph({
  type,
  title,
  description,
  image,
  url,
  siteName
}: {
  type?: 'website' | 'article' | 'product' | string;
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}) {
  return (
    <>
      {type && <Meta property="og:type" content={type} />}
      {title && <Meta property="og:title" content={title} />}
      {description && <Meta property="og:description" content={description} />}
      {image && <Meta property="og:image" content={image} />}
      {url && <Meta property="og:url" content={url} />}
      {siteName && <Meta property="og:site_name" content={siteName} />}
    </>
  );
}

export function MetaTwitterCard({
  card = 'summary',
  site,
  creator,
  title,
  description,
  image
}: {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
}) {
  return (
    <>
      <Meta name="twitter:card" content={card} />
      {site && <Meta name="twitter:site" content={site} />}
      {creator && <Meta name="twitter:creator" content={creator} />}
      {title && <Meta name="twitter:title" content={title} />}
      {description && <Meta name="twitter:description" content={description} />}
      {image && <Meta name="twitter:image" content={image} />}
    </>
  );
}

export function MetaRobots({
  index = true,
  follow = true,
  noarchive = false,
  nosnippet = false
}: {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
}) {
  const directives = [
    index ? 'index' : 'noindex',
    follow ? 'follow' : 'nofollow'
  ];

  if (noarchive) directives.push('noarchive');
  if (nosnippet) directives.push('nosnippet');

  return <Meta name="robots" content={directives.join(', ')} />;
}
