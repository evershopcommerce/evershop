import React from 'react';
import { useScopedFormContext } from '../WidgetSettingsScope.js';

/**
 * Coerce a form value into an array.
 *
 * The page-builder drawer holds list settings as real arrays, but the legacy
 * widget editor's `<Form>` seeds them as a JSON *string* (a hidden input with
 * `defaultValue={JSON.stringify(...)}`), so a setting read can come back as a
 * string. Parse JSON strings, pass arrays through, and fall back otherwise.
 */
export function asArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Read a list-valued widget setting as a guaranteed array, and normalize the
 * underlying form state to a real array once on mount.
 *
 * Why: on the legacy `/admin/widgets/edit` page the `<Form>` seeds list
 * settings as a JSON string, which (a) crashes array consumers like
 * `RepeatableAccordion` (`items.map is not a function`) and (b) would fail the
 * widget's array schema on save. The page-builder drawer already holds an
 * array, so the normalize step no-ops there — it only fires for a string.
 */
export function useArraySetting<T>(name: string, fallback: T[]): T[] {
  const { watch, getValues, setValue } = useScopedFormContext();
  React.useEffect(() => {
    const current = getValues(name);
    if (typeof current === 'string') {
      setValue(name, asArray(current, fallback), { shouldDirty: false });
    }
    // Mount-only: seed once; later edits flow through the caller's mutators.
  }, []);
  return asArray<T>(watch(name), fallback);
}
