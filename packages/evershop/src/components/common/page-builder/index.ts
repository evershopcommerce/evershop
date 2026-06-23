export { Editable } from './Editable.js';
export { EditableMarkdown } from './EditableMarkdown.js';
export { EditableImage, EditableImageOverlay } from './EditableImage.js';
export type { ImageFieldMapping } from './EditableImage.js';
export { PageBuilderBridge } from './PageBuilderBridge.js';
export {
  WidgetContextProvider,
  useWidgetUid,
  useWidgetSettings
} from './WidgetContext.js';
export { WidgetChrome } from './WidgetChrome.js';
export {
  WidgetSettingsScope,
  useWidgetSettingsScope,
  useScopedFieldName,
  useScopedFormContext,
  applyScopePrefix
} from './WidgetSettingsScope.js';
export {
  isInPageBuilderIframe,
  isPageBuilderActive,
  markPageBuilderActive,
  postToParent
} from './pageBuilderMode.js';

// Drawer primitives — shared by every widget setting form.
export {
  Field,
  Section,
  Segmented,
  Slider,
  Toggle,
  drawerInputClass,
  drawerTextareaClass
} from './drawer/index.js';
export { RepeatableAccordion } from './drawer/RepeatableAccordion.js';
export { asArray, useArraySetting } from './drawer/arraySetting.js';
export {
  AnchorPicker,
  ANCHOR_CELLS
} from './drawer/AnchorPicker.js';
export type { ContentAnchor } from './drawer/AnchorPicker.js';

// Form fields.
export { ImagePickerField } from './fields/ImagePickerField.js';
export {
  ColorSwatchField,
  DEFAULT_SWATCHES
} from './fields/ColorSwatchField.js';
export { MarkdownBodyField } from './fields/MarkdownBodyField.js';
export { CtaField, ctaButtonVariant } from './fields/CtaField.js';

// Entity pickers.
export { CategoryPicker } from './pickers/CategoryPicker.js';
export { ProductPicker } from './pickers/ProductPicker.js';
export { CollectionPicker } from './pickers/CollectionPicker.js';
export { PagePicker } from './pickers/PagePicker.js';
export { LinkPicker } from './pickers/LinkPicker.js';
export { EntitySearchList } from './pickers/EntitySearchList.js';
