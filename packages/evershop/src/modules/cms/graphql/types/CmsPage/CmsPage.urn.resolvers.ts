import { CmsUrn } from '@evershop/evershop/lib/urn';

export default {
  CmsPage: {
    urn: (page: { uuid: string }) => CmsUrn.page(page.uuid)
  }
};
