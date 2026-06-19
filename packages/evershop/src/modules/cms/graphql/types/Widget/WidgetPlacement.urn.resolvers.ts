import { CmsUrn } from '@evershop/evershop/lib/urn';

export default {
  WidgetPlacement: {
    urn: (placement: { uuid: string }) => CmsUrn.widgetPlacement(placement.uuid)
  }
};
