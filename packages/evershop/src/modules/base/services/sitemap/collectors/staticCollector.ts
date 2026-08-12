import { createHash } from 'crypto';
import {
  CollectorStat,
  SitemapChangeFreq,
  SitemapCollector,
  SitemapEntry
} from '../types.js';
import { StaticPathSpec, mapStaticPaths } from './mappers.js';

export interface StaticCollectorSpec {
  paths: string[];
  changefreq?: SitemapChangeFreq;
  priority?: number;
  name?: string;
}

/**
 * A config-driven collector for fixed storefront paths (default just the homepage `/`). No DB.
 * The fingerprint is the path count — a config change that alters the count (add/remove a path)
 * triggers a regenerate; a same-count swap is picked up by the max-age backstop (design §4).
 */
export function createStaticCollector(spec: StaticCollectorSpec): SitemapCollector {
  const name = spec.name ?? 'static';
  const specs: StaticPathSpec[] = spec.paths.map((path) => ({
    path,
    changefreq: spec.changefreq,
    priority: spec.priority
  }));
  return {
    name,
    async collect(): Promise<SitemapEntry[]> {
      return mapStaticPaths(specs);
    },
    async getFingerprint(): Promise<CollectorStat> {
      const paths = mapStaticPaths(specs).map((entry) => entry.path);
      return {
        count: paths.length,
        maxUpdatedAt: null,
        // Hash the paths so changing `staticPaths` in config (add/remove/swap) triggers a regen.
        pathsHash: paths.length
          ? createHash('md5').update([...paths].sort().join(',')).digest('hex')
          : null
      };
    }
  };
}
