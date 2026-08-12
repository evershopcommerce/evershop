import { CmsUrn } from '@evershop/evershop/lib/urn';

export default {
  Widget: {
    // The Widget GraphQL type represents a widget instance row. Its URN type
    // is `widget_instance` per spec 01 — phase 2 renames the underlying table
    // to `widget_instance` to match.
    urn: (widget: { uuid: string }) => CmsUrn.widgetInstance(widget.uuid)
  }
};
