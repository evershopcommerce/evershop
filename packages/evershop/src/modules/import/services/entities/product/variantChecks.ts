import type {
  Lookup,
  StoredAttribute,
  StoredProduct,
  StoredVariantGroup
} from '../../ports/lookup.js';
import {
  PRD_13,
  PRD_14,
  PRD_15,
  PRD_16,
  PRD_17,
  PRD_18,
  PRD_19,
  PRD_24
} from '../../rules/productRules.js';
import type { ImportIssue } from '../../types.js';
import type { ConvertedRow } from '../definition.js';
import type { ProductData } from './productValidator.js';

/** A variant group holds at most five axes (`variant_group` has five columns). */
export const MAX_AXES = 5;

/**
 * The rows of one `variant_group` label are the members of one group (§ 5.3).
 * The checks are in two places. Pass 1 (`indexVariants`) needs no store: the
 * rows of a label are next to each other, and they name the same axes. Pass 2
 * (`checkVariantRow`) needs the store, and sees the rows of a label one after
 * the other, across the batches, so it keeps the label that is open in `run`
 * and closes it when the next label begins (`closeRun`, and `finish` for the
 * last one).
 */
export interface VariantState {
  // pass 1
  last: string | null;
  seen: Set<string>;
  axes: Map<string, { row: number; list: string[] }>;
  /** Labels whose axes are not usable: the store is not asked about them. */
  bad: Set<string>;
  // pass 2
  run: LabelRun | null;
  /** A stored variant group → the label that reuses it (PRD-18). */
  owner: Map<number, string>;
  groups: Map<number, StoredVariantGroup | null>;
}

interface LabelRun {
  label: string;
  /** The axis codes in lower case, sorted. */
  axes: string[];
  firstRow: number;
  /** What the first member says; the others must say the same. */
  share: ShareFields;
  groupId: number | null;
  packageId: number | null;
  storedGroup: { id: number; row: number } | null;
  fileCombos: Array<{ sku: string; row: number; combo: string | null }>;
  storedCombos: Map<string, string | null>;
  /** Axes that PRD-14 refused: PRD-15 does not ask them for a value as well. */
  badAxes: Set<string>;
}

interface ShareFields {
  category: string;
  tax_class: string;
  no_shipping_required: string;
  weight: string;
  /** The other attributes: the code → the text (PRD-24). */
  attributes: Record<string, string>;
}

export function createVariantState(): VariantState {
  return {
    last: null,
    seen: new Set(),
    axes: new Map(),
    bad: new Set(),
    run: null,
    owner: new Map(),
    groups: new Map()
  };
}

const lower = (text: string) => text.trim().toLowerCase();

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

/** Pass 1: the adjacency of the rows of a label, and their axes. */
export function indexVariants(
  state: VariantState,
  row: ConvertedRow<ProductData>
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const { rowNumber } = row;
  const label = row.data.variant_group ?? null;
  const axes = row.data.variant_axes ?? [];

  if (label === null) {
    state.last = null;
    if (axes.length > 0) {
      issues.push(
        PRD_13.issue({
          rowNumber,
          column: 'variant_axes',
          params: { reason: 'no_group' },
          message:
            'variant_axes is given without a variant_group, so the product is not part of a variant group.',
          value: axes.join('|')
        })
      );
    }
    return issues;
  }

  if (state.last !== label && state.seen.has(label)) {
    issues.push(
      PRD_17.issue({
        rowNumber,
        column: 'variant_group',
        params: { group: label },
        message: `The rows of the variant group "${label}" are not next to each other. Put them together in the file.`,
        value: label
      })
    );
  }
  state.seen.add(label);
  state.last = label;

  const bad = (reason: string, message: string) => {
    issues.push(
      PRD_13.issue({
        rowNumber,
        column: 'variant_axes',
        params: { reason, group: label },
        message,
        value: axes.join('|')
      })
    );
    state.bad.add(label);
  };
  if (axes.length === 0) {
    bad(
      'missing',
      `The variant group "${label}" needs variant_axes: the attributes its products differ by, such as color|size.`
    );
    return issues;
  }
  if (axes.length > MAX_AXES) {
    bad('too_many', `A variant group has at most ${MAX_AXES} axes.`);
    return issues;
  }
  const duplicate = axes.find((code, at) => axes.indexOf(code) !== at);
  if (duplicate !== undefined) {
    bad('duplicate', `The axis "${duplicate}" is listed twice.`);
    return issues;
  }
  const first = state.axes.get(label);
  if (!first) {
    state.axes.set(label, { row: rowNumber, list: axes });
  } else if (!sameSet(first.list, axes)) {
    bad(
      'differs',
      `The axes of the variant group "${label}" differ from those of row ${first.row}. Every row of a group names the same axes.`
    );
  }
  return issues;
}

/** What pass 2 knows about the row, worked out by the validator. */
export interface VariantRowContext {
  row: ConvertedRow<ProductData>;
  stored: StoredProduct | null;
  lookup: Lookup;
  /** The attribute group of the merged record, if it could be told. */
  groupId: number | null;
  /** The package of the merged record (the default package counts), if known. */
  packageId: number | null;
  attribute(code: string): StoredAttribute | null | undefined;
  /** Is the attribute linked to the attribute group of the row? */
  linked(attributeId: number): boolean;
  /** The id of the option the cell of an axis names, if it names exactly one. */
  optionId(code: string): number | null;
}

const comboOf = (axes: readonly string[], ids: Array<number | null>) =>
  ids.some((id) => id === null)
    ? null
    : axes.map((code, at) => `${code}=${ids[at]}`).join('|');

/** Pass 2: the checks of one member of a variant group. */
export async function checkVariantRow(
  state: VariantState,
  ctx: VariantRowContext
): Promise<ImportIssue[]> {
  const issues: ImportIssue[] = [];
  const { row, stored } = ctx;
  const { rowNumber, data } = row;
  const label = data.variant_group ?? null;
  if (state.run && state.run.label !== label) {
    issues.push(...closeRun(state));
  }
  if (label === null || state.bad.has(label)) {
    return issues;
  }
  const sku = row.key as string;
  const axes = [...(data.variant_axes ?? [])].map(lower).sort();

  const share = shareOf(data, axes);
  let { run } = state;
  if (!run) {
    run = {
      label,
      axes,
      firstRow: rowNumber,
      share,
      groupId: ctx.groupId,
      packageId: ctx.packageId,
      storedGroup: null,
      fileCombos: [],
      storedCombos: new Map(),
      badAxes: new Set()
    };
    state.run = run;
    issues.push(...checkAxes(ctx, axes, rowNumber, label, run.badAxes));
  } else {
    issues.push(...compareShared(run, share, ctx, rowNumber));
  }

  // PRD-15: every member has a value for every axis.
  for (const code of axes) {
    if (run.badAxes.has(code)) continue;
    const given = data.attributes?.some((cell) => lower(cell.code) === code);
    const kept = stored?.attributeCodes.some((c) => lower(c) === code);
    if (!given && !kept) {
      issues.push(
        PRD_15.issue({
          rowNumber,
          column: `attr:${code}`,
          params: { axis: code, group: label },
          message: `The product "${sku}" is a member of the variant group "${label}" and needs a value for its axis "${code}".`
        })
      );
    }
  }

  // PRD-18: the stored group of a member that exists.
  if (stored && stored.variantGroupId !== null) {
    issues.push(...(await checkStoredGroup(state, run, ctx, stored)));
  }

  // The combination, for PRD-19 when the group is closed.
  const ids = axes.map((code) => ctx.optionId(code));
  let combo = comboOf(axes, ids);
  if (combo === null && stored && run.storedGroup) {
    // The cell is blank: the member keeps its stored value for the axis.
    const group = state.groups.get(run.storedGroup.id);
    const member = group?.members.find((m) => m.sku === sku);
    if (member) {
      combo = comboOf(
        axes,
        axes.map((code) => {
          const key = Object.keys(member.options).find(
            (k) => lower(k) === code
          );
          return ids[axes.indexOf(code)] ?? (key ? member.options[key] : null);
        })
      );
    }
  }
  run.storedCombos.delete(sku);
  run.fileCombos.push({ sku, row: rowNumber, combo });
  return issues;
}

function shareOf(data: ProductData, axes: readonly string[]): ShareFields {
  const attributes: Record<string, string> = {};
  for (const cell of data.attributes ?? []) {
    const code = lower(cell.code);
    if (!axes.includes(code)) {
      attributes[code] = cell.text;
    }
  }
  return {
    category: data.category ?? '',
    tax_class: lower(data.tax_class ?? ''),
    no_shipping_required:
      data.no_shipping_required === undefined
        ? ''
        : String(data.no_shipping_required),
    weight: data.weight ?? '',
    attributes
  };
}

// PRD-14: the axes exist, are selects, and are in the attribute group.
function checkAxes(
  ctx: VariantRowContext,
  axes: readonly string[],
  rowNumber: number,
  label: string,
  bad: Set<string>
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const problem = (axis: string, reason: string, message: string) => {
    bad.add(axis);
    issues.push(
      PRD_14.issue({
        rowNumber,
        column: 'variant_axes',
        params: { axis, reason, group: label },
        message,
        value: axis
      })
    );
  };
  for (const code of axes) {
    const attribute = ctx.attribute(code);
    if (!attribute) {
      problem(
        code,
        'not_found',
        `The axis "${code}" of the variant group "${label}" is not an attribute of the store.`
      );
    } else if (attribute.type !== 'select') {
      problem(
        code,
        'not_select',
        `The axis "${code}" of the variant group "${label}" must be an attribute of type select.`
      );
    } else if (ctx.groupId !== null && !ctx.linked(attribute.id)) {
      problem(
        code,
        'not_in_group',
        `The axis "${code}" of the variant group "${label}" is not linked to the attribute group of the products.`
      );
    }
  }
  return issues;
}

// PRD-16 and PRD-24: the members agree with the first one.
function compareShared(
  run: LabelRun,
  share: ShareFields,
  ctx: VariantRowContext,
  rowNumber: number
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const sku = ctx.row.key as string;
  const differs = (
    rule: typeof PRD_16 | typeof PRD_24,
    column: string,
    what: string
  ) =>
    issues.push(
      rule.issue({
        rowNumber,
        column,
        params: { group: run.label, firstRow: run.firstRow, field: column },
        message: `The product "${sku}" has a different ${what} from the first member of the variant group "${run.label}" (row ${run.firstRow}). All members must have the same.`
      })
    );
  if (
    ctx.groupId !== null &&
    run.groupId !== null &&
    ctx.groupId !== run.groupId
  ) {
    differs(PRD_16, 'attribute_group', 'attribute group');
  }
  if (
    ctx.packageId !== null &&
    run.packageId !== null &&
    ctx.packageId !== run.packageId
  ) {
    differs(PRD_16, 'package', 'package');
  }
  for (const column of [
    'category',
    'tax_class',
    'no_shipping_required',
    'weight'
  ] as const) {
    if (share[column] !== run.share[column]) {
      differs(PRD_24, column, column.replace(/_/g, ' '));
    }
  }
  const codes = new Set([
    ...Object.keys(share.attributes),
    ...Object.keys(run.share.attributes)
  ]);
  for (const code of [...codes].sort()) {
    if (share.attributes[code] !== run.share.attributes[code]) {
      differs(PRD_24, `attr:${code}`, `value of "${code}"`);
    }
  }
  return issues;
}

// PRD-18: a member that exists is in a stored group.
async function checkStoredGroup(
  state: VariantState,
  run: LabelRun,
  ctx: VariantRowContext,
  stored: StoredProduct
): Promise<ImportIssue[]> {
  const issues: ImportIssue[] = [];
  const { rowNumber } = ctx.row;
  const id = stored.variantGroupId as number;
  const label = run.label;
  if (run.storedGroup && run.storedGroup.id !== id) {
    issues.push(
      PRD_18.issue({
        rowNumber,
        column: 'variant_group',
        params: { group: label, firstRow: run.storedGroup.row },
        message: `The product "${stored.sku}" is in another stored variant group than the member in row ${run.storedGroup.row}. The import never moves a product from one group to another.`,
        value: label
      })
    );
    return issues;
  }
  if (run.storedGroup) {
    return issues;
  }
  run.storedGroup = { id, row: rowNumber };
  const owner = state.owner.get(id);
  if (owner !== undefined && owner !== label) {
    issues.push(
      PRD_18.issue({
        rowNumber,
        column: 'variant_group',
        params: { group: label, other: owner },
        message: `The variant groups "${owner}" and "${label}" of the file are the same group in the store. Give them one label.`,
        value: label
      })
    );
  } else {
    state.owner.set(id, label);
  }
  if (!state.groups.has(id)) {
    const found = await ctx.lookup.variantGroups([id]);
    state.groups.set(id, found.get(id) ?? null);
  }
  const group = state.groups.get(id);
  if (!group) {
    return issues;
  }
  const inconsistent = (column: string, message: string) =>
    issues.push(
      PRD_18.issue({
        code: 'VARIANT_INCONSISTENT',
        rowNumber,
        column,
        params: { group: label, stored: id },
        message,
        value: label
      })
    );
  if (!sameSet(group.axisCodes.map(lower), run.axes)) {
    inconsistent(
      'variant_axes',
      `The stored variant group of "${
        stored.sku
      }" has the axes ${group.axisCodes.join(
        ', '
      )}, and the file says ${run.axes.join(', ')}.`
    );
  }
  if (ctx.groupId !== null && group.attributeGroupId !== ctx.groupId) {
    inconsistent(
      'attribute_group',
      `The stored variant group of "${stored.sku}" belongs to another attribute group than the one of the file.`
    );
  }
  const stock = group.members.find((m) => m.packageId !== null)?.packageId;
  if (
    stock !== undefined &&
    ctx.packageId !== null &&
    stock !== ctx.packageId
  ) {
    inconsistent(
      'package',
      `The members of the stored variant group of "${stored.sku}" have another package than the one of the file.`
    );
  }
  for (const member of group.members) {
    const keys = Object.keys(member.options);
    const combo = comboOf(
      run.axes,
      run.axes.map((code) => {
        const key = keys.find((k) => lower(k) === code);
        return key ? member.options[key] : null;
      })
    );
    run.storedCombos.set(member.sku, combo);
  }
  return issues;
}

/** PRD-19: the group as it will be after the import has no two equal combinations. */
export function closeRun(state: VariantState): ImportIssue[] {
  const { run } = state;
  state.run = null;
  if (!run) {
    return [];
  }
  const holders = new Map<string, Array<{ sku: string; row: number | null }>>();
  for (const [sku, combo] of run.storedCombos) {
    if (combo !== null) {
      holders.set(combo, [{ sku, row: null }]);
    }
  }
  const issues: ImportIssue[] = [];
  for (const member of run.fileCombos) {
    if (member.combo === null) continue;
    const held = holders.get(member.combo) ?? [];
    if (held.length > 0) {
      const other = held[0];
      issues.push(
        PRD_19.issue({
          rowNumber: member.row,
          column: 'variant_group',
          params: {
            group: run.label,
            combination: member.combo,
            other: other.sku
          },
          message: `The product "${
            member.sku
          }" has the same values for the axes (${run.axes.join(', ')}) as "${
            other.sku
          }" in the variant group "${
            run.label
          }". A storefront would show two identical choices.`,
          value: run.label
        })
      );
    }
    holders.set(member.combo, [...held, { sku: member.sku, row: member.row }]);
  }
  return issues;
}
