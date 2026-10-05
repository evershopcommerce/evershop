import type { GraphQLSchema } from 'graphql';
import { getWidget } from '../../../../lib/widget/widgetManager.js';
import {
  findSettingsProblems,
  getWidgetVariableSpec,
  type WidgetVariableSpec
} from '../../../../lib/widget/widgetVariables.js';

type Settings = Record<string, unknown>;

export interface AssertWidgetSettingsDeps {
  /** The storefront schema as it is now: what a page that renders this widget runs against. */
  getSchema(): Promise<GraphQLSchema>;
  /** The compiled component file a widget type is registered with. */
  getComponentPath(type: string): string | undefined;
  getSpec(componentPath: string): WidgetVariableSpec | null;
}

const defaultDeps: AssertWidgetSettingsDeps = {
  // Imported when needed, not at the top: building the schema imports every
  // module's resolvers, and the cms services are among them.
  getSchema: async () =>
    (await import('../../../graphql/services/getRequestSchema.js')).getSchemaFor(
      false
    ),
  getComponentPath: (type) => getWidget(type)?.component,
  getSpec: getWidgetVariableSpec
};

/**
 * Refuse widget settings the storefront would reject when it renders the widget.
 *
 * A widget's settings are the variables of its page query, and a typed input
 * (the slideshow's `slides: [SlideInput]`) rejects any key it does not define.
 * The widget's own JSON Schema cannot catch that: it is kept loose on purpose
 * (`additionalProperties: true`, so older saved instances stay valid) and it is a
 * hand-written copy of what the GraphQL type says. So the GraphQL type is asked
 * directly, as it stands now, and no list of fields lives here.
 *
 * On update pass `previous`, the settings already stored: only what the update
 * itself introduces is refused, so an older key the page builder cannot show
 * never locks a merchant out of saving anything else on the widget.
 *
 * Never blocks on tooling: a widget with no declarations, or a component file
 * that cannot be read, is not checked.
 */
export async function assertWidgetSettingsMatchSchema(
  type: string,
  settings: Settings,
  previous?: Settings | null,
  deps: AssertWidgetSettingsDeps = defaultDeps
): Promise<void> {
  const componentPath = deps.getComponentPath(type);
  if (!componentPath) {
    return;
  }
  const spec = deps.getSpec(componentPath);
  if (!spec || spec.defs.length === 0) {
    return;
  }
  const problems = findSettingsProblems(
    await deps.getSchema(),
    spec,
    settings,
    previous
  );
  if (problems.length > 0) {
    throw new Error(
      `Widget settings do not match the current GraphQL schema: ${problems.join('; ')}`
    );
  }
}
