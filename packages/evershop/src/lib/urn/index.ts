/**
 * Public surface of the URN library.
 *
 * Side-effect: registers the core schemas at module load time. Modules and
 * extensions that import this module — even just for the `UrnService` class
 * — will trigger registration. Third-party extensions that need additional
 * URN types call `registerUrnSchema()` from their own `bootstrap.ts`.
 */

import {
  registerUrnSchema,
  getUrnSchema,
  hasUrnSchema,
  listUrnSchemas
} from './services/UrnRegistry.js';
import { UrnService } from './services/UrnService.js';

[
  { service: 'catalog', type: 'product', description: 'Catalog product' },
  { service: 'catalog', type: 'category', description: 'Product category' },
  {
    service: 'cms',
    type: 'widget_instance',
    description: 'Page builder widget instance'
  },
  {
    service: 'cms',
    type: 'widget_placement',
    description: 'Widget placement on a route + area'
  },
  { service: 'cms', type: 'page', description: 'CMS page' },
  { service: 'oms', type: 'order', description: 'Customer order' },
  { service: 'customer', type: 'customer', description: 'Customer account' },
  { service: 'blog', type: 'post', description: 'Blog post' },
  { service: 'blog', type: 'category', description: 'Blog category' },
  { service: 'blog', type: 'tag', description: 'Blog tag' }
].forEach(registerUrnSchema);

export const CatalogUrn = {
  product: (uuid: string) => UrnService.build('catalog', 'product', uuid),
  category: (uuid: string) => UrnService.build('catalog', 'category', uuid)
};

export const CmsUrn = {
  widgetInstance: (uuid: string) =>
    UrnService.build('cms', 'widget_instance', uuid),
  widgetPlacement: (uuid: string) =>
    UrnService.build('cms', 'widget_placement', uuid),
  page: (uuid: string) => UrnService.build('cms', 'page', uuid)
};

export const OmsUrn = {
  order: (uuid: string) => UrnService.build('oms', 'order', uuid)
};

export const BlogUrn = {
  post: (uuid: string) => UrnService.build('blog', 'post', uuid),
  category: (uuid: string) => UrnService.build('blog', 'category', uuid),
  tag: (uuid: string) => UrnService.build('blog', 'tag', uuid)
};

export const CustomerUrn = {
  customer: (uuid: string) => UrnService.build('customer', 'customer', uuid)
};

export { UrnService };
export { registerUrnSchema, getUrnSchema, hasUrnSchema, listUrnSchemas };
export type { UrnSchema } from './services/UrnRegistry.js';
export type { UrnParts } from './services/UrnService.js';
