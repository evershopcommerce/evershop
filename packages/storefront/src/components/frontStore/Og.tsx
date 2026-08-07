import { Meta } from '@components/common/Meta.js';
import React from 'react';

export interface OgProps {
  type?: 'website' | 'article' | 'product' | string;

  /**
   * The title of the page to be displayed when shared
   */
  title?: string;

  /**
   * A brief description of the page content
   */
  description?: string;

  /**
   * URL to an image that represents the page
   * Recommended size: 1200x630 pixels for best display across platforms
   */
  image?: string;

  /**
   * The canonical URL of the page
   */
  url?: string;

  /**
   * The name of the website or app
   */
  siteName?: string;

  /**
   * For article type, the published date in ISO format
   */
  publishedTime?: string;

  /**
   * For article type, author names or URLs
   */
  authors?: string[];

  /**
   * Locale code for the content (e.g., 'en_US')
   */
  locale?: string;

  /**
   * Alternative locales available for the page
   */
  alternateLocales?: string[];
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';

  twitterSite?: string;

  /**
   * Twitter @username of the content creator
   */
  twitterCreator?: string;

  twitterImage?: string;

  /**
   * Whether to include Twitter card tags
   */
  includeTwitterTags?: boolean;
}

export function Og({
  type = 'website',
  title,
  description,
  image,
  url,
  siteName,
  publishedTime,
  authors,
  locale,
  alternateLocales,
  twitterCard = 'summary',
  twitterSite,
  twitterCreator,
  twitterImage,
  includeTwitterTags = true
}: OgProps) {
  return (
    <>
      <Meta property="og:type" content={type} />

      {title && <Meta property="og:title" content={title} />}
      {description && <Meta property="og:description" content={description} />}
      {image && <Meta property="og:image" content={image} />}
      {url && <Meta property="og:url" content={url} />}
      {siteName && <Meta property="og:site_name" content={siteName} />}

      {type === 'article' && publishedTime && (
        <Meta property="article:published_time" content={publishedTime} />
      )}

      {type === 'article' &&
        authors?.length &&
        authors.map((author, index) => (
          <Meta
            key={`author-${index}`}
            property="article:author"
            content={author}
          />
        ))}

      {locale && <Meta property="og:locale" content={locale} />}

      {alternateLocales?.length &&
        alternateLocales.map((alternateLocale, index) => (
          <Meta
            key={`locale-${index}`}
            property="og:locale:alternate"
            content={alternateLocale}
          />
        ))}

      {includeTwitterTags && (
        <>
          <Meta name="twitter:card" content={twitterCard} />
          {title && <Meta name="twitter:title" content={title} />}
          {description && (
            <Meta name="twitter:description" content={description} />
          )}
          {twitterSite && <Meta name="twitter:site" content={twitterSite} />}
          {twitterCreator && (
            <Meta name="twitter:creator" content={twitterCreator} />
          )}
          {twitterImage && <Meta name="twitter:image" content={twitterImage} />}
        </>
      )}
    </>
  );
}
