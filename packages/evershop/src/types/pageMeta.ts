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
}
export interface PageMetaInfo {
  route: {
    id: string;
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
}
