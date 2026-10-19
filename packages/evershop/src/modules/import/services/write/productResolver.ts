import { parseList } from '../cells/parsers.js';
import type { ProductRow } from '../entities/product/productValidator.js';
import type {
  Lookup,
  NamedRecord,
  StoredAttribute,
  StoredProduct
} from '../ports/lookup.js';
import { ALL_08, ALL_21 } from '../rules/allRules.js';
import { PRD_09, PRD_10, PRD_12 } from '../rules/productRules.js';
import type { ImportIssue } from '../types.js';

const lower = (text: string) => text.trim().toLowerCase();

/** What the names and codes of a row are in the store now. */
export interface ResolvedProduct {
  /** The attribute group named by the row, if it names one and it exists. */
  groupId: number | null;
  packageId: number | null;
  taxClassId: number | null;
  categoryId: number | null;
  attributes: Array<{ attribute_code: string; value: string | string[] }>;
  /** What no longer exists, or is no longer unique: the row cannot be written. */
  problems: ImportIssue[];
}

/**
 * Turns the names, codes and option texts of a row into ids, at the time the
 * row is written (the store may have changed since the check; D-6, S3 of
 * § 8.6). The store is asked for a batch of rows together (`prepare`), and
 * every answer is kept for the whole run, so a name that every row uses is asked
 * for once.
 */
export class ProductResolver {
  private readonly groups = new Map<string, NamedRecord[]>();

  private readonly packages = new Map<string, NamedRecord[]>();

  private readonly taxClasses = new Map<string, NamedRecord[]>();

  private readonly categories = new Map<string, number>();

  private readonly attributes = new Map<string, StoredAttribute>();

  private readonly options = new Map<number, Map<string, number[]>>();

  private asked = {
    groups: new Set<string>(),
    packages: new Set<string>(),
    taxClasses: new Set<string>(),
    categories: new Set<string>(),
    attributes: new Set<string>()
  };

  defaultPackage: NamedRecord | null | undefined;

  constructor(private readonly lookup: Lookup) {}

  async prepare(rows: readonly ProductRow[]): Promise<void> {
    const { lookup, asked } = this;
    const fresh = (seen: Set<string>, keys: Iterable<string>) => {
      const wanted = [...new Set(keys)].filter((key) => !seen.has(key));
      wanted.forEach((key) => seen.add(key));
      return wanted;
    };
    const named = (pick: (data: ProductRow['data']) => string | undefined) =>
      rows.flatMap((row) => {
        const value = pick(row.data);
        return value === undefined ? [] : [lower(value)];
      });

    const groups = fresh(
      asked.groups,
      named((d) => d.attribute_group)
    );
    if (groups.length > 0) {
      for (const [key, records] of await lookup.attributeGroups(groups)) {
        this.groups.set(key, records);
      }
    }
    const packages = fresh(
      asked.packages,
      named((d) => d.package)
    );
    if (packages.length > 0) {
      for (const [key, records] of await lookup.packages(packages)) {
        this.packages.set(key, records);
      }
    }
    const taxClasses = fresh(
      asked.taxClasses,
      named((d) => d.tax_class)
    );
    if (taxClasses.length > 0) {
      for (const [key, records] of await lookup.taxClasses(taxClasses)) {
        this.taxClasses.set(key, records);
      }
    }
    const categories = fresh(
      asked.categories,
      rows.flatMap((row) => (row.data.category ? [row.data.category] : []))
    );
    if (categories.length > 0) {
      for (const [key, category] of await lookup.categories(categories)) {
        this.categories.set(key, category.id);
      }
    }
    const codes = fresh(
      asked.attributes,
      rows.flatMap((row) => (row.data.attributes ?? []).map((a) => a.code))
    );
    if (codes.length > 0) {
      for (const [key, attribute] of await lookup.attributes(codes)) {
        this.attributes.set(key, attribute);
      }
    }
    // The options of the select attributes, for the texts of this batch.
    const wanted = new Map<number, Set<string>>();
    for (const row of rows) {
      for (const cell of row.data.attributes ?? []) {
        const attribute = this.attributes.get(cell.code);
        if (
          attribute &&
          (attribute.type === 'select' || attribute.type === 'multiselect')
        ) {
          const texts = wanted.get(attribute.id) ?? new Set<string>();
          const items =
            attribute.type === 'multiselect'
              ? parseList(cell.text)
              : [cell.text];
          for (const text of items) {
            const known = this.options.get(attribute.id);
            if (!known?.has(lower(text))) texts.add(lower(text));
          }
          wanted.set(attribute.id, texts);
        }
      }
    }
    for (const [attributeId, texts] of wanted) {
      if (texts.size === 0) continue;
      const known =
        this.options.get(attributeId) ?? new Map<string, number[]>();
      const found = await lookup.attributeOptions(attributeId, [...texts]);
      for (const text of texts) {
        known.set(text, found.get(text) ?? []);
      }
      this.options.set(attributeId, known);
    }
    if (this.defaultPackage === undefined) {
      this.defaultPackage = await lookup.defaultPackage();
    }
  }

  /** The ids of one row. A problem means the row must not be written. */
  resolve(row: ProductRow, stored: StoredProduct | null): ResolvedProduct {
    const { data, rowNumber } = row;
    const problems: ImportIssue[] = [];
    const one = (
      cache: Map<string, NamedRecord[]>,
      value: string | undefined,
      column: string,
      label: string
    ): number | null => {
      if (value === undefined) return null;
      const records = cache.get(lower(value)) ?? [];
      if (records.length === 0) {
        problems.push(
          PRD_09.issue({
            rowNumber,
            column,
            params: { reference: column, value },
            message: `The ${label} "${value}" is no longer in the store.`,
            value
          })
        );
        return null;
      }
      if (records.length > 1) {
        problems.push(
          ALL_21.issue({
            rowNumber,
            column,
            params: { reference: column, value, matches: records.length },
            message: `The ${label} "${value}" matches ${records.length} records, so it is not clear which is meant.`,
            value
          })
        );
        return null;
      }
      return records[0].id;
    };
    const groupId = one(
      this.groups,
      data.attribute_group,
      'attribute_group',
      'attribute group'
    );
    const packageId = one(this.packages, data.package, 'package', 'package');
    const taxClassId = one(
      this.taxClasses,
      data.tax_class,
      'tax_class',
      'tax class'
    );
    let categoryId: number | null = null;
    if (data.category !== undefined) {
      const id = this.categories.get(data.category);
      if (id === undefined) {
        problems.push(
          PRD_10.issue({
            rowNumber,
            column: 'category',
            params: { reference: 'category', value: data.category },
            message: `The category "${data.category}" is no longer a category of the store.`,
            value: data.category
          })
        );
      } else {
        categoryId = id;
      }
    }

    const attributes: ResolvedProduct['attributes'] = [];
    for (const cell of data.attributes ?? []) {
      const attribute = this.attributes.get(cell.code);
      if (!attribute) {
        problems.push(
          ALL_08.issue({
            rowNumber,
            column: cell.column,
            params: { column: cell.column },
            message: `The attribute "${cell.code}" is no longer in the store.`,
            value: cell.text
          })
        );
        continue;
      }
      if (attribute.type === 'select' || attribute.type === 'multiselect') {
        const texts =
          attribute.type === 'multiselect' ? parseList(cell.text) : [cell.text];
        const ids: string[] = [];
        for (const text of texts) {
          const found = this.options.get(attribute.id)?.get(lower(text)) ?? [];
          if (found.length === 0) {
            problems.push(
              PRD_12.issue({
                rowNumber,
                column: cell.column,
                params: { attribute: attribute.code, option: text },
                message: `"${text}" is no longer an option of the attribute "${attribute.code}".`,
                value: text
              })
            );
          } else if (found.length > 1) {
            problems.push(
              ALL_21.issue({
                rowNumber,
                column: cell.column,
                params: { reference: 'attribute option', value: text },
                message: `"${text}" matches ${found.length} options of the attribute "${attribute.code}".`,
                value: text
              })
            );
          } else {
            ids.push(String(found[0]));
          }
        }
        if (ids.length === texts.length) {
          attributes.push({
            attribute_code: attribute.code,
            value: attribute.type === 'multiselect' ? ids : ids[0]
          });
        }
      } else {
        attributes.push({ attribute_code: attribute.code, value: cell.text });
      }
    }
    void stored;
    return { groupId, packageId, taxClassId, categoryId, attributes, problems };
  }
}
