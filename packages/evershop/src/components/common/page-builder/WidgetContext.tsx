import React, { useContext } from 'react';

/**
 * Wraps a rendered widget so nested `<Editable>` components can identify
 * which widget instance they belong to without prop-drilling. The iframe
 * widget shell mounts one of these per widget render. Production
 * storefront still benefits — widgets get widget context so future v2
 * patches (e.g., self-healing on partial render) can find their identity.
 *
 * `settings` carries the widget's currently-applied settings (with overlay
 * already merged in for page-builder mode), so `<Editable>` can build a
 * full-replace settings UPDATE op without an extra round-trip.
 */
export interface WidgetContextValue {
  uid: string;
  settings: Record<string, unknown>;
}

const WidgetContextRef = React.createContext<WidgetContextValue | null>(null);

export function WidgetContextProvider({
  uid,
  settings,
  children
}: {
  uid: string;
  settings?: Record<string, unknown>;
  children: React.ReactNode;
}): React.ReactElement {
  const value = React.useMemo<WidgetContextValue>(
    () => ({ uid, settings: settings ?? {} }),
    [uid, settings]
  );
  return (
    <WidgetContextRef.Provider value={value}>
      {children}
    </WidgetContextRef.Provider>
  );
}

export function useWidgetUid(): string | null {
  const ctx = useContext(WidgetContextRef);
  return ctx?.uid ?? null;
}

export function useWidgetSettings(): Record<string, unknown> {
  const ctx = useContext(WidgetContextRef);
  return ctx?.settings ?? {};
}

export const _WidgetContextRef = WidgetContextRef;
