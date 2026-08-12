import { Og } from '@components/frontStore/Og.js';
import React, {
  LinkHTMLAttributes,
  MetaHTMLAttributes,
  ScriptHTMLAttributes
} from 'react';

interface HeadTagsProps {
  pageInfo: {
    title: string;
    description: string;
    keywords: string[];
    canonicalUrl: string;
    favicon: string;
    alternates?: Array<{ hreflang: string; href: string }>;
    ogInfo: {
      locale: string;
      title: string;
      description: string;
      image: string;
      url: string;
      type: 'website' | 'article' | 'product' | string;
      siteName: string;
      twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player';
      twitterSite: string;
      twitterCreator: string;
      twitterImage: string;
      publishedTime?: string;
      authors?: string[];
      tags?: string[];
    };
  };
  themeConfig: {
    headTags: {
      metas: Array<MetaHTMLAttributes<HTMLMetaElement>>;
      links: Array<LinkHTMLAttributes<HTMLLinkElement>>;
      scripts: Array<ScriptHTMLAttributes<HTMLScriptElement>>;
      base?: {
        href: string;
        target: '_blank' | '_self' | '_parent' | '_top';
      };
    };
  };
}
export default function HeadTags({
  pageInfo: {
    title,
    description,
    keywords,
    canonicalUrl,
    ogInfo,
    favicon,
    alternates
  },
  themeConfig: {
    headTags: { metas, links, scripts, base }
  }
}: HeadTagsProps) {
  React.useEffect(() => {
    const head = document.querySelector('head');
    scripts.forEach((script) => {
      const scriptElement = document.createElement('script');
      Object.keys(script).forEach((key) => {
        if (script[key]) {
          scriptElement[key] = script[key];
        }
      });
      head?.appendChild(scriptElement);
    });
  }, []);

  // `.ico` / `.svg` are served as-is (the image endpoint resizes via sharp,
  // which handles neither). A raster favicon (PNG/JPG/WebP) is downscaled to the
  // standard tab sizes plus a 180px Apple touch icon, all through `/images`.
  const renderFavicon = () => {
    if (!favicon) {
      return null;
    }
    const lower = favicon.toLowerCase().split('?')[0];
    if (lower.endsWith('.ico') || lower.endsWith('.svg')) {
      return <link rel="icon" href={favicon} />;
    }
    const icon = (size: number) =>
      `/images?src=${encodeURIComponent(favicon)}&w=${size}&h=${size}&q=90&f=png`;
    return (
      <>
        <link rel="icon" type="image/png" sizes="32x32" href={icon(32)} />
        <link rel="icon" type="image/png" sizes="16x16" href={icon(16)} />
        <link rel="apple-touch-icon" sizes="180x180" href={icon(180)} />
      </>
    );
  };

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {metas.map((meta, index) => (
        <meta key={index} {...meta} />
      ))}
      {links.map((link, index) => (
        <link key={index} {...link} />
      ))}
      {scripts.map((script, index) => (
        <script key={index} {...script} />
      ))}
      {renderFavicon()}
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {alternates?.map((alternate) => (
        <link
          key={alternate.hreflang}
          rel="alternate"
          hrefLang={alternate.hreflang}
          href={alternate.href}
        />
      ))}
      {base && <base {...base} />}
      <Og
        type={ogInfo.type}
        title={title}
        description={description}
        url={ogInfo.url}
        siteName={ogInfo.siteName}
        image={ogInfo.image}
        locale={ogInfo.locale}
        alternateLocales={(alternates ?? [])
          .map((alternate) => alternate.hreflang)
          .filter(
            (hreflang) =>
              hreflang !== 'x-default' && hreflang !== ogInfo.locale
          )}
        twitterCard={ogInfo.twitterCard}
        twitterSite={ogInfo.twitterSite}
        twitterCreator={ogInfo.twitterCreator}
        twitterImage={ogInfo.twitterImage}
        publishedTime={ogInfo.publishedTime}
        authors={ogInfo.authors}
        tags={ogInfo.tags}
      />
    </>
  );
}

export const layout = {
  areaId: 'head',
  sortOrder: 5
};

export const query = `
  query query {
    pageInfo {
      title
      description
      keywords
      canonicalUrl
      favicon
      alternates {
        hreflang
        href
      }
      ogInfo {
        locale
        title
        description
        image
        url
        type
        siteName
        twitterCard
        twitterSite
        twitterCreator
        twitterImage
        publishedTime
        authors
        tags
      }
    }
    themeConfig {
      headTags {
        metas {
          name
          content
          charSet
          httpEquiv
          property
          itemProp
          itemType
          itemID
          lang
        }
        links {
          rel
          href
          sizes
          type
          hrefLang
          media
          title
          as
          crossOrigin
          integrity
          referrerPolicy
        }
        scripts {
          src
          type
          async
          defer
          crossOrigin
          integrity
          noModule
          nonce
        }
        base {
          href
          target
        }
      }
    }
  }
`;
