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
  pageInfo: { title, description, keywords, canonicalUrl, ogInfo, favicon },
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
      {favicon && <link rel="icon" href={favicon} />}
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {base && <base {...base} />}
      <Og
        type={ogInfo.type}
        title={title}
        description={description}
        url={ogInfo.url}
        siteName={ogInfo.siteName}
        image={ogInfo.image}
        locale={ogInfo.locale}
        twitterCard={ogInfo.twitterCard}
        twitterSite={ogInfo.twitterSite}
        twitterCreator={ogInfo.twitterCreator}
        twitterImage={ogInfo.twitterImage}
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
