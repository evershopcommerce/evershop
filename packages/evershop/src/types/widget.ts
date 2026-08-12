// =============================================================================
// Widget schema (JSON Schema draft-07 subset, validated by AJV)
// =============================================================================

export interface BaseFieldSchema {
  title?: string;
  description?: string;
}

export interface StringFieldSchema extends BaseFieldSchema {
  type: 'string';
  default?: string;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  format?: 'uri' | 'email' | 'date' | 'date-time';
}

export interface NumberFieldSchema extends BaseFieldSchema {
  type: 'integer' | 'number';
  default?: number;
  minimum?: number;
  maximum?: number;
  enum?: number[];
}

export interface BooleanFieldSchema extends BaseFieldSchema {
  type: 'boolean';
  default?: boolean;
}

export interface ObjectFieldSchema extends BaseFieldSchema {
  type: 'object';
  properties: Record<string, AnyFieldSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ArrayFieldSchema extends BaseFieldSchema {
  type: 'array';
  items: AnyFieldSchema;
  minItems?: number;
  maxItems?: number;
}

export type AnyFieldSchema =
  | StringFieldSchema
  | NumberFieldSchema
  | BooleanFieldSchema
  | ObjectFieldSchema
  | ArrayFieldSchema;

export interface WidgetSchemaDefinition {
  type: 'object';
  properties: Record<string, AnyFieldSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface WidgetGraphQLBlock {
  /** SDL fragment declaring this widget's settings types. */
  typeDefs: string;
  /** Name of the type from `typeDefs` that becomes a member of the WidgetSettings union. */
  settingsType: string;
}

export type WidgetCategory =
  | 'content'
  | 'commerce'
  | 'navigation'
  | 'marketing'
  | 'layout';

// =============================================================================
// Widget registration shape
// =============================================================================

export interface Widget<T = any> {
  name: string;
  type: string;
  description?: string;
  category?: WidgetCategory;
  /**
   * Optional lucide-react icon name (e.g. `Columns`, `Type`, `Image`) used
   * to badge the widget in the page-builder palette and Layers tab. Looked
   * up against a curated map in `pageBuilder/components/widgetIcons.ts`;
   * unknown names (and missing values) fall back to the generic `Layers`
   * icon. The full lucide catalog isn't whitelisted — extensions that need
   * an icon outside the curated set should send a PR to extend the map.
   */
  icon?: string;
  settingComponent: string;
  settingComponentKey?: string;
  component: string;
  componentKey?: string;
  /**
   * Mandatory path to the React component rendered in the page-builder
   * Widgets palette's hover preview card. The component receives no props
   * — it should render a self-contained stylized mock (rectangles, lines,
   * stand-ins) so it works without runtime data / context. See the demo
   * (`specifications/page-builder-design/project/EverShop Page Builder.standalone.html`)
   * `RENDERERS` map for the design pattern.
   *
   * Path must point to a `.js` file with an uppercase basename. Bundled
   * into the admin build by AreaLoader under key
   * `admin_widget_preview_<type>` and looked up by `WidgetPreviewCard`.
   */
  previewComponent: string;
  previewComponentKey?: string;
  enabled: boolean;
  defaultSettings: Record<string, T>;
  /**
   * JSON Schema (draft-07) describing the shape of `settings`. Validated by
   * AJV at registration (against `defaultSettings`) and on each save.
   *
   * Optional in v1 for backward compat with extensions that pre-date Phase 2b.
   * A widget without a schema logs a warning at registration but still works.
   */
  schema?: WidgetSchemaDefinition;
  /**
   * Optional GraphQL settings type. When present, `Widget.settings` resolves
   * as a member of the `WidgetSettings` union. When absent, `Widget.settings`
   * is null and clients should fall back to `Widget.rawSettings`.
   */
  graphql?: WidgetGraphQLBlock;
}

export interface WidgetInstance<T = any> extends Widget<T> {
  id: string;
  type: string;
  settings: Record<string, T>;
  props: Record<string, any>;
  areaId: string[];
  sortOrder: number;
  /** UUID for the source `widget_instance` row (page builder needs this). */
  uuid?: string;
}
