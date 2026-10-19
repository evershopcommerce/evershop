import type { DescriptionDeps } from '../cells/description.js';
import { convertMetafieldCell } from '../cells/metafieldCell.js';
import { cellMessage } from '../cells/parsers.js';
import type { StoredMetafield } from '../ports/lookup.js';
import { ALL_11 } from '../rules/allRules.js';
import { MET_01, MET_02, MET_04 } from '../rules/metafieldRules.js';
import type { ImportIssue } from '../types.js';

/** `{namespace: {key: value}}`, the form core stores and takes. */
export type MetaDataSet = Record<string, Record<string, unknown>>;

export interface MetafieldRead {
  /** The values of the cells that could be read and passed the check. */
  values: MetaDataSet;
  issues: ImportIssue[];
}

const columnOf = (key: string) => `metafield:${key}`;

/**
 * Reads the custom-field cells of a row: each is converted to the form of its
 * definition (MET-01, MET-03, MET-05; ALL-11 for JSON that does not parse) and
 * checked by the store (MET-02). A cell that names no definition is skipped: the
 * header said so (ALL-08). The problems are collected for each column, as the
 * rule MET-06 wants, never thrown at the first.
 */
export function readMetafields(args: {
  rowNumber: number;
  cells: Record<string, string> | undefined;
  definitions: ReadonlyMap<string, StoredMetafield>;
  deps: DescriptionDeps;
}): MetafieldRead {
  const { rowNumber, cells, definitions, deps } = args;
  const values: MetaDataSet = {};
  const issues: ImportIssue[] = [];
  for (const [key, text] of Object.entries(cells ?? {})) {
    const definition = definitions.get(key);
    if (!definition) {
      continue;
    }
    const column = columnOf(key);
    const converted = convertMetafieldCell(definition, text, deps);
    if (!converted.ok) {
      const rule = converted.code === 'INVALID_JSON' ? ALL_11 : MET_01;
      issues.push(
        rule.issue({
          rowNumber,
          column,
          params: { ...converted.params, field: key },
          message: cellMessage(column, converted),
          value: text
        })
      );
      continue;
    }
    const checked = definition.check(converted.value);
    if (!checked.ok) {
      issues.push(
        MET_02.issue({
          rowNumber,
          column,
          params: { field: key },
          message: `The value in column "${column}" is not valid: ${checked.message}`,
          value: text
        })
      );
      continue;
    }
    if (checked.value !== undefined) {
      (values[definition.namespace] ??= {})[definition.key] = checked.value;
    }
  }
  return { values, issues };
}

/**
 * MET-04: a required field needs a value when the record is created (the
 * stored value counts on an update). Core enforces `required` only when the
 * payload carries custom fields, and the import always sends them.
 */
export function missingRequired(args: {
  rowNumber: number;
  key: string;
  creates: boolean;
  cells: Record<string, string> | undefined;
  stored: MetaDataSet | null;
  definitions: ReadonlyMap<string, StoredMetafield>;
}): ImportIssue[] {
  const { rowNumber, cells, stored, definitions } = args;
  const issues: ImportIssue[] = [];
  for (const [key, definition] of definitions) {
    if (!definition.required) {
      continue;
    }
    const given = cells?.[key] !== undefined;
    const kept =
      !args.creates &&
      stored?.[definition.namespace]?.[definition.key] !== undefined;
    if (!given && !kept) {
      issues.push(
        MET_04.issue({
          rowNumber,
          column: columnOf(key),
          params: { field: key },
          message: `The custom field "${key}" is required and "${args.key}" has no value for it.`
        })
      );
    }
  }
  return issues;
}

/** The stored set with the new values laid over it, key by key (§ 5.9). */
export function mergeMetaData(
  stored: MetaDataSet | null | undefined,
  values: MetaDataSet
): MetaDataSet {
  const merged: MetaDataSet = structuredClone(stored ?? {});
  for (const [namespace, fields] of Object.entries(values)) {
    merged[namespace] = { ...merged[namespace], ...structuredClone(fields) };
  }
  return merged;
}
