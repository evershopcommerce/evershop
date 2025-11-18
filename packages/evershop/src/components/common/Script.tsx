/* eslint-disable no-console */
import React from 'react';

interface BaseScriptProps {
  src?: string;
  async?: boolean;
  defer?: boolean;
  type?:
    | 'text/javascript'
    | 'module'
    | 'importmap'
    | 'speculationrules'
    | 'application/json'
    | 'application/ld+json'
    | string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  nonce?: string;
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
  noModule?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  blocking?: 'render';
  attributionSrc?: boolean | string;
  children?: React.ReactNode;
}

interface ExternalScriptProps extends BaseScriptProps {
  src: string;
  children?: never;
}

interface InlineScriptProps extends BaseScriptProps {
  src?: never;
  children: React.ReactNode;
}

type ScriptProps = ExternalScriptProps | InlineScriptProps;

const VALID_REFERRER_POLICIES = [
  'no-referrer',
  'no-referrer-when-downgrade',
  'origin',
  'origin-when-cross-origin',
  'same-origin',
  'strict-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url'
] as const;

const VALID_CROSSORIGIN_VALUES = ['anonymous', 'use-credentials'] as const;

function validateScriptProps(props: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!props.src && !props.children) {
    errors.push('Script must have either src attribute or children content');
  }

  if (props.src && props.children) {
    errors.push('Script cannot have both src attribute and children content');
  }

  if (props.async && props.defer) {
    errors.push('Script cannot have both async and defer attributes');
  }

  if (!props.src && props.async) {
    errors.push('async attribute has no effect on inline scripts');
  }

  if (!props.src && props.defer) {
    errors.push('defer attribute has no effect on inline scripts');
  }

  if (
    props.referrerPolicy &&
    !VALID_REFERRER_POLICIES.includes(props.referrerPolicy)
  ) {
    errors.push(`Invalid referrerPolicy: ${props.referrerPolicy}`);
  }

  if (
    props.crossOrigin &&
    !VALID_CROSSORIGIN_VALUES.includes(props.crossOrigin)
  ) {
    errors.push(`Invalid crossOrigin: ${props.crossOrigin}`);
  }

  if (props.integrity && !props.src) {
    errors.push('integrity attribute requires src attribute');
  }

  if (
    props.fetchPriority &&
    !['high', 'low', 'auto'].includes(props.fetchPriority)
  ) {
    errors.push(`Invalid fetchPriority: ${props.fetchPriority}`);
  }

  if (props.blocking && props.blocking !== 'render') {
    errors.push('blocking attribute can only be "render"');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function sanitizeScriptProps(props: any): Record<string, any> {
  const allowedAttributes = [
    'src',
    'async',
    'defer',
    'type',
    'crossOrigin',
    'integrity',
    'nonce',
    'referrerPolicy',
    'noModule',
    'fetchPriority',
    'blocking',
    'attributionSrc'
  ];

  const sanitized = Object.keys(props)
    .filter(
      (key) =>
        allowedAttributes.includes(key) &&
        props[key] !== undefined &&
        props[key] !== null
    )
    .reduce((obj, key) => {
      if (typeof props[key] === 'boolean') {
        if (props[key]) {
          obj[key] =
            key === 'attributionSrc' && props[key] === true ? '' : props[key];
        }
      } else {
        obj[key] = String(props[key]).trim();
      }
      return obj;
    }, {} as Record<string, any>);

  return sanitized;
}

export function Script(props: ScriptProps) {
  if (process.env.NODE_ENV === 'development') {
    const validation = validateScriptProps(props);
    if (!validation.isValid) {
      console.error('Script component validation errors:', validation.errors);
      validation.errors.forEach((error) => console.error(`Script: ${error}`));
    }
  }

  if (!props.src && !props.children) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Script component has no src or children, not rendering');
    }
    return null;
  }

  const sanitizedProps = sanitizeScriptProps(props);

  if (props.src) {
    return <script {...sanitizedProps} />;
  }

  return <script {...sanitizedProps}>{props.children}</script>;
}

export function ScriptExternal({
  src,
  async = false,
  defer = false,
  crossOrigin,
  integrity,
  referrerPolicy,
  fetchPriority = 'auto',
  nonce
}: {
  src: string;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
  fetchPriority?: 'high' | 'low' | 'auto';
  nonce?: string;
}) {
  return (
    <Script
      src={src}
      async={async}
      defer={defer}
      crossOrigin={crossOrigin}
      integrity={integrity}
      referrerPolicy={referrerPolicy}
      fetchPriority={fetchPriority}
      nonce={nonce}
    />
  );
}

export function ScriptModule({
  src,
  children,
  nonce,
  crossOrigin,
  integrity,
  referrerPolicy
}: {
  src?: string;
  children?: React.ReactNode;
  nonce?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
}) {
  if (src && children) {
    console.error('ScriptModule cannot have both src and children');
    return null;
  }

  if (src) {
    return (
      <Script
        src={src}
        type="module"
        nonce={nonce}
        crossOrigin={crossOrigin}
        integrity={integrity}
        referrerPolicy={referrerPolicy}
      />
    );
  }

  return (
    <Script
      type="module"
      nonce={nonce}
      crossOrigin={crossOrigin}
      integrity={integrity}
      referrerPolicy={referrerPolicy}
    >
      {children}
    </Script>
  );
}

export function ScriptInline({
  children,
  type = 'text/javascript',
  nonce
}: {
  children: React.ReactNode;
  type?: string;
  nonce?: string;
}) {
  return (
    <Script type={type} nonce={nonce}>
      {children}
    </Script>
  );
}

export function ScriptJSON({
  id,
  data,
  nonce
}: {
  id?: string;
  data: any;
  nonce?: string;
}) {
  return (
    <Script type="application/json" nonce={nonce} {...(id && { id })}>
      {JSON.stringify(data, null, 2)}
    </Script>
  );
}

export function ScriptImportMap({
  imports,
  scopes,
  nonce
}: {
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
  nonce?: string;
}) {
  const importMap: any = {};
  if (imports) importMap.imports = imports;
  if (scopes) importMap.scopes = scopes;

  return (
    <Script type="importmap" nonce={nonce}>
      {JSON.stringify(importMap, null, 2)}
    </Script>
  );
}

export function ScriptNoModule({
  src,
  children,
  async = false,
  defer = false
}: {
  src?: string;
  children?: React.ReactNode;
  async?: boolean;
  defer?: boolean;
}) {
  if (src && children) {
    console.error('ScriptNoModule cannot have both src and children');
    return null;
  }

  if (src) {
    return <Script src={src} noModule={true} async={async} defer={defer} />;
  }

  return (
    <Script noModule={true} async={async} defer={defer}>
      {children}
    </Script>
  );
}
