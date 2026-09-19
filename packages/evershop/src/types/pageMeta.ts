export interface OgInfo {
  locale: string;
  title: string;
  description: string;
  image: string;
  url: string;
  type: 'website' | 'article' | 'product' | string;
  siteName: string;
  twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player' | string;
  twitterSite: string;
  twitterCreator: string;
  twitterImage: string;
  /** Article-type Open Graph fields (blog posts). */
  publishedTime?: string;
  authors?: string[];
  tags?: string[];
}

export interface BreadcrumbItem {
  url: string;
  title: string;
}

export interface PageMetaInfo {
  route: {
    id: string;
    isAdmin: boolean;
    path: string;
    params: Record<string, string>;
    url: string;
  };
  title: string;
  description: string;
  ogInfo: Partial<OgInfo>;
  robots: string;
  canonicalUrl: string;
  keywords: string[];
  baseUrl: string;
  /** When set, the pageInfo.breadcrumbs resolver returns these verbatim. */
  breadcrumbs?: BreadcrumbItem[];
}
