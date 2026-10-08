import {
  getVariableValues,
  isInputObjectType,
  isInputType,
  isListType,
  isNonNullType,
  parse,
  typeFromAST,
  type GraphQLInputType,
  type GraphQLSchema,
  type OperationDefinitionNode,
  type VariableDefinitionNode
} from 'graphql';

/**
 * Check what a widget feeds its page query against the schema as it is NOW.
 *
 * A widget's settings reach the page query as GraphQL variables. Some of those
 * variables are typed input objects (the slideshow's `slides: [SlideInput]`),
 * and an input object rejects any key it does not define. When ONE variable is
 * rejected, `execute()` returns no `data` at all, so a single bad key in a
 * single widget used to blank the whole page and crash the first core
 * component that reads a prop (`HeadTags`).
 *
 * Nothing in here knows a field name. The input types come from the schema
 * passed in, so a field added to `SlideInput` tomorrow is accepted tomorrow and
 * a field removed from it is reported tomorrow, with no second list to update.
 * The final verdict is graphql-js's own `getVariableValues`, the exact step
 * `execute()` runs, so this check cannot disagree with what a request would do.
 */

/** One variable a widget's query declares, e.g. `$slides: [SlideInput]`. */
export interface VariableDefinition {
  /** The name used in the operation. Unique per request. */
  alias: string;
  /** The type as the component wrote it: `[SlideInput]`, `Int!`. */
  type: string;
  /** The name the component's author gave it (`slides`). Used in messages. */
  origin?: string;
}

/** A key inside a variable's value that the input type does not define. */
export interface UnknownKey {
  /** The variable's own name, e.g. `slides`. */
  variable: string;
  /** Where the key sits inside the value, e.g. `slides[0].imageAlt`. */
  path: string;
  /** The input type that does not define it, e.g. `SlideInput`. */
  typeName: string;
  /** What that type does define, sorted. */
  accepted: string[];
}

/** Something GraphQL would still reject once the unknown keys are gone. */
export interface VariableProblem {
  variable: string;
  message: string;
}

export interface VariableCheck {
  /** The values with every unknown key removed. Safe to hand to `execute()` when `problems` is empty. */
  values: Record<string, unknown>;
  unknownKeys: UnknownKey[];
  problems: VariableProblem[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Copy `value` without the keys `type` does not define. Only an input object has
 * keys to strip: scalars, enums and a `JSON` scalar take whatever they are given.
 * Never mutates its argument (a widget's settings object may be shared).
 */
function strip(
  type: GraphQLInputType,
  value: unknown,
  path: string,
  variable: string,
  found: UnknownKey[]
): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (isNonNullType(type)) {
    return strip(type.ofType, value, path, variable, found);
  }
  if (isListType(type)) {
    // GraphQL accepts a lone item where a list is declared, so do we.
    return Array.isArray(value)
      ? value.map((item, i) =>
          strip(type.ofType, item, `${path}[${i}]`, variable, found)
        )
      : strip(type.ofType, value, path, variable, found);
  }
  if (isInputObjectType(type) && isPlainObject(value)) {
    const fields = type.getFields();
    const kept: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (!Object.prototype.hasOwnProperty.call(fields, key)) {
        found.push({
          variable,
          path: `${path}.${key}`,
          typeName: type.name,
          accepted: Object.keys(fields).sort()
        });
        continue;
      }
      kept[key] = strip(fields[key].type, item, `${path}.${key}`, variable, found);
    }
    return kept;
  }
  return value;
}

/**
 * graphql-js repeats the rejected value in its reason, and a merchant can paste
 * anything into a setting. The message ends up in a log line, so keep it short.
 */
const MAX_REASON = 300;
const clip = (text: string) =>
  text.length > MAX_REASON ? `${text.slice(0, MAX_REASON)}…` : text;

/**
 * Turn one graphql-js coercion error into `slides[0].width: Int cannot represent ...`.
 * graphql-js prints the offending value first, then ` at "<path>"; <reason>`. The
 * path holds only names and indexes, so the LAST such marker is the real one even
 * when a user's text happens to look like it.
 */
function explain(
  message: string,
  nameOf: (alias: string) => string
): VariableProblem {
  const flat = message.replace(/\s+/g, ' ');
  const alias = /^Variable "\$([^"]+)"/.exec(flat)?.[1] ?? '';
  const variable = nameOf(alias);

  let at: RegExpExecArray | null = null;
  const marker = / at "([A-Za-z0-9_$.[\]]+)"; /g;
  for (let m = marker.exec(flat); m; m = marker.exec(flat)) {
    at = m;
  }
  if (at) {
    const path = `${variable}${at[1].slice(alias.length)}`;
    return {
      variable,
      message: `${path}: ${clip(flat.slice(at.index + at[0].length))}`
    };
  }

  const required = /of required type "(.+)" was not provided\./.exec(flat);
  if (required) {
    return {
      variable,
      message: `${variable} is required (${required[1]}) and was not provided`
    };
  }
  const nonNull = /of non-null type "(.+)" must not be null\./.exec(flat);
  if (nonNull) {
    return { variable, message: `${variable} must not be null (${nonNull[1]})` };
  }
  const notInput = /expected value of type "(.+)" which cannot be used as an input type\./.exec(
    flat
  );
  if (notInput) {
    return {
      variable,
      message: `${variable} is declared as ${notInput[1]}, which is not an input type in the schema`
    };
  }
  return {
    variable,
    message: `${variable}: ${clip(flat.replace(/^Variable "\$[^"]+" /, ''))}`
  };
}

/**
 * Check `values` (keyed by variable alias) against `defs` and `schema`.
 *
 *  - Keys the current input types do not define are removed from `values` and
 *    listed in `unknownKeys`. A caller that renders pages uses the cleaned
 *    `values`; a caller that saves data refuses `unknownKeys`.
 *  - Whatever GraphQL still rejects after that (a string where an `Int` goes, a
 *    missing required field, a `null` for a `!` type) is listed in `problems`.
 */
export function checkVariables(
  schema: GraphQLSchema,
  defs: VariableDefinition[],
  values: Record<string, unknown>
): VariableCheck {
  const unknownKeys: UnknownKey[] = [];
  const problems: VariableProblem[] = [];
  const cleaned: Record<string, unknown> = { ...values };
  const nodes: VariableDefinitionNode[] = [];
  const nameOf = (alias: string) =>
    defs.find((d) => d.alias === alias)?.origin ?? alias;

  for (const def of defs) {
    const name = def.origin ?? def.alias;
    let node: VariableDefinitionNode | undefined;
    try {
      const document = parse(`query ($${def.alias}: ${def.type}) { __typename }`);
      node = (document.definitions[0] as OperationDefinitionNode)
        .variableDefinitions?.[0];
    } catch {
      node = undefined;
    }
    if (!node) {
      problems.push({
        variable: name,
        message: `${name} is declared as "${def.type}", which is not a GraphQL type`
      });
      continue;
    }
    nodes.push(node);

    const type = typeFromAST(schema, node.type);
    if (
      type &&
      isInputType(type) &&
      Object.prototype.hasOwnProperty.call(cleaned, def.alias)
    ) {
      cleaned[def.alias] = strip(type, cleaned[def.alias], name, name, unknownKeys);
    }
  }

  if (nodes.length > 0) {
    const result = getVariableValues(schema, nodes, cleaned);
    if (result.errors) {
      for (const error of result.errors) {
        problems.push(explain(error.message, nameOf));
      }
    }
  }
  return { values: cleaned, unknownKeys, problems };
}

/** `slides[0].imageAlt is not a field of SlideInput (it accepts: id, image, ...)` */
export function describeUnknownKey(key: UnknownKey): string {
  return `${key.path} is not a field of ${key.typeName} (it accepts: ${key.accepted.join(', ')})`;
}
