import React, { useCallback, useContext, useMemo } from 'react';
import { FieldValues, useFormContext } from 'react-hook-form';

/**
 * Namespacing wrapper for widget settings forms. When a setting form renders
 * inside `<WidgetSettingsScope uid={selectedUid}>`, any field declared inside
 * it gets `block.<uid>.` prepended at the field-component layer.
 *
 * Convention preservation: existing widget setting components write field
 * names like `<InputField name="settings.className">`. The scope adds
 * `block.<uid>.` to produce the page-level form path
 * `block.<uid>.settings.className`. On the standalone `widgetEdit` page no
 * scope is mounted, so the same component binds to `settings.className`
 * directly — matching the form's `{ name, status, settings: { ... } }`
 * default-values shape.
 *
 * Used in:
 *   - Page-builder admin settings drawer — multiple widgets share one
 *     parent `useForm` mounted at the editor level; each widget's settings
 *     sub-form mounts inside its own scope.
 *   - Standalone `widgetEdit` page — scope is omitted, fields use the
 *     same bare names and the standalone form holds the values directly.
 */

export interface WidgetSettingsScopeValue {
  /** Path prefix to prepend to field names, including the trailing dot. */
  pathPrefix: string;
  /** The widget instance UID this scope is bound to (for downstream consumers). */
  uid: string;
}

const WidgetSettingsScopeRef =
  React.createContext<WidgetSettingsScopeValue | null>(null);

export function WidgetSettingsScope({
  uid,
  children
}: {
  uid: string;
  children: React.ReactNode;
}): React.ReactElement {
  const value = useMemo<WidgetSettingsScopeValue>(
    () => ({
      uid,
      pathPrefix: `block.${uid}.`
    }),
    [uid]
  );
  return (
    <WidgetSettingsScopeRef.Provider value={value}>
      {children}
    </WidgetSettingsScopeRef.Provider>
  );
}

/** Returns the active scope or null when no scope is mounted. */
export function useWidgetSettingsScope(): WidgetSettingsScopeValue | null {
  return useContext(WidgetSettingsScopeRef);
}

/**
 * Pure path-resolution helper. Exported separately so it can be unit-tested
 * without React render setup. `useScopedFieldName` is a thin wrapper that
 * sources the prefix from context.
 */
export function applyScopePrefix(
  pathPrefix: string | null | undefined,
  name: string
): string {
  if (!pathPrefix) return name;
  if (name.startsWith(pathPrefix)) return name;
  return pathPrefix + name;
}

/**
 * Resolve a field name against the active scope. Returns the input unchanged
 * when no scope is mounted (e.g., the standalone `widgetEdit` page). Field
 * components call this once per render and pass the result to RHF's
 * `<Controller>` / `register`.
 *
 * Idempotent if the input already starts with `pathPrefix` — useful in case
 * a field is rendered both directly and through nested scopes.
 */
export function useScopedFieldName(name: string): string {
  const scope = useWidgetSettingsScope();
  return applyScopePrefix(scope?.pathPrefix, name);
}

/**
 * Scope-aware drop-in for `useFormContext`. Returns the same form context,
 * but with `register`, `watch`, `setValue`, `unregister`, and `getValues`
 * auto-prefixed by the active `WidgetSettingsScope`. Outside a scope (the
 * standalone `widgetEdit` page) it behaves identically to `useFormContext`.
 *
 * Widget setting components that use `register/setValue/watch` directly
 * (without going through Field components) should swap their
 * `useFormContext` import for this hook so the same component participates
 * correctly in both surfaces.
 */
export function useScopedFormContext<T extends FieldValues = FieldValues>() {
  const ctx = useFormContext<T>();
  const scope = useWidgetSettingsScope();
  const prefix = scope?.pathPrefix ?? '';

  const resolve = useCallback(
    (name: any): any => {
      if (typeof name !== 'string' || !prefix) return name;
      return applyScopePrefix(prefix, name);
    },
    [prefix]
  );

  // RHF's method types are deeply generic. The wrappers below preserve
  // the call signatures via `Parameters<...>` and only rewrite the first
  // path argument before delegating.
  const register: typeof ctx.register = useCallback(
    ((name: any, options?: any) => ctx.register(resolve(name), options)) as any,
    [ctx, resolve]
  );
  const watch: typeof ctx.watch = useCallback(
    ((name?: any, defaultValue?: any) => {
      if (name === undefined) return ctx.watch();
      if (Array.isArray(name)) return ctx.watch(name.map(resolve), defaultValue);
      return ctx.watch(resolve(name), defaultValue);
    }) as any,
    [ctx, resolve]
  );
  const setValue: typeof ctx.setValue = useCallback(
    ((name: any, value: any, options?: any) =>
      ctx.setValue(resolve(name), value, options)) as any,
    [ctx, resolve]
  );
  const unregister: typeof ctx.unregister = useCallback(
    ((name?: any, options?: any) => {
      if (name === undefined) return ctx.unregister(undefined, options);
      if (Array.isArray(name))
        return ctx.unregister(name.map(resolve), options);
      return ctx.unregister(resolve(name), options);
    }) as any,
    [ctx, resolve]
  );
  const getValues: typeof ctx.getValues = useCallback(
    ((name?: any) => {
      if (name === undefined) return ctx.getValues();
      if (Array.isArray(name)) return ctx.getValues(name.map(resolve));
      return ctx.getValues(resolve(name));
    }) as any,
    [ctx, resolve]
  );

  return {
    ...ctx,
    register,
    watch,
    setValue,
    unregister,
    getValues
  };
}
