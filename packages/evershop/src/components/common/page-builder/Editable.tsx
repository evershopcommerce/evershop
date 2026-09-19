import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
import { isPageBuilderActive, postToParent } from './pageBuilderMode.js';
import { useWidgetSettings, useWidgetUid } from './WidgetContext.js';

// Hover/focus affordance for inline-editable elements inside the page-builder
// iframe. Injected once per document so all `<Editable>` instances share the
// same rules; production storefront never injects this because
// `EditableInPreview` is the only thing that mounts and it's gated on
// `isPageBuilderActive()`.
//
//   - Idle: 1px dotted transparent outline (no visual; reserves space so
//           the layout doesn't shift on hover).
//   - Hover: dotted #00805f outline.
//   - Focused (actively editing): solid #00805f outline.
const EDITABLE_STYLE_ID = 'evershop-pb-editable-style';
const EDITABLE_CSS = `
  [data-evershop-editable-field] {
    outline: 1px dotted transparent;
    outline-offset: 2px;
    cursor: text;
    transition: outline-color 0.12s ease;
  }
  [data-evershop-editable-field]:hover {
    outline-color: #00805f;
  }
  [data-evershop-editable-field]:focus {
    outline: 1px solid #00805f;
    outline-offset: 2px;
  }
`;

function ensureEditableStyleInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(EDITABLE_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = EDITABLE_STYLE_ID;
  el.textContent = EDITABLE_CSS;
  document.head.appendChild(el);
}

/**
 * Inline-edit primitive. Renders a plain `<Tag>{children}</Tag>` in production
 * storefront; activates a `contenteditable` element with focus-preserving
 * imperative DOM management inside the page-builder iframe.
 *
 * Design notes:
 *   - SSR-safe: first render always uses the production path. Page-builder
 *     mode is detected after `useEffect` runs post-hydration, so there's no
 *     hydration mismatch.
 *   - React doesn't reconcile contenteditable contents — we drive `innerText`
 *     imperatively via `useLayoutEffect`. The sync is skipped while the user
 *     is focused so preview-data round-trips don't disrupt typing.
 *   - Plain text only. Paste handler strips formatting. Children must be a
 *     string (a future widget that wants rich text uses a different field).
 */

interface EditableProps {
  /** Path under the widget's settings, e.g. "settings.heading" or "settings.slides.0.heading". */
  fieldPath: string;
  /** Allow line breaks. Default false — Enter blurs. */
  multiline?: boolean;
  /** Tag to render. Default 'span'. */
  as?: React.ElementType;
  className?: string;
  /** Current text. Must be a string. */
  children?: string;
  /** Focus the element on mount (used by click-to-edit wrappers like
   *  `EditableMarkdown`, which mount us in direct response to a click). */
  focusOnMount?: boolean;
  /** Called after the element blurs and its pending edit has flushed. */
  onBlur?: () => void;
}

export function Editable({
  fieldPath,
  multiline = false,
  as: Tag = 'span',
  className,
  children = '',
  focusOnMount = false,
  onBlur
}: EditableProps): React.ReactElement {
  // Defer page-builder detection until after mount so the first render is
  // identical between SSR and hydration.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const widgetUid = useWidgetUid();
  const widgetSettings = useWidgetSettings();
  const inPageBuilder = isClient && isPageBuilderActive();

  if (!inPageBuilder || !widgetUid) {
    return React.createElement(Tag, { className }, children);
  }

  return (
    <EditableInPreview
      Tag={Tag}
      className={className}
      fieldPath={fieldPath}
      multiline={multiline}
      widgetUid={widgetUid}
      widgetSettings={widgetSettings}
      focusOnMount={focusOnMount}
      onBlur={onBlur}
    >
      {children}
    </EditableInPreview>
  );
}

interface PreviewProps {
  Tag: React.ElementType;
  className?: string;
  fieldPath: string;
  multiline: boolean;
  widgetUid: string;
  widgetSettings: Record<string, unknown>;
  children: string;
  focusOnMount?: boolean;
  onBlur?: () => void;
}

/**
 * Apply a dot-path setting key to an existing settings object, returning a
 * new object. Mutating-style nested writes ("slides.0.heading") are
 * supported by walking the path, cloning each level. Falls back to a
 * top-level key if the path has no dots.
 */
function patchSettings(
  settings: Record<string, unknown>,
  fieldPath: string,
  value: unknown
): Record<string, unknown> {
  // fieldPath is "settings.<rest>" per spec § 7.4 — strip the prefix.
  const rest = fieldPath.startsWith('settings.')
    ? fieldPath.slice('settings.'.length)
    : fieldPath;
  const segments = rest.split('.');
  if (segments.length === 1) {
    return { ...settings, [segments[0]]: value };
  }
  const out: Record<string, unknown> = { ...settings };
  let cursor: any = out;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const numeric = /^\d+$/.test(segments[i + 1]);
    const existing = cursor[seg];
    cursor[seg] = numeric
      ? Array.isArray(existing)
        ? [...existing]
        : []
      : { ...(existing || {}) };
    cursor = cursor[seg];
  }
  cursor[segments[segments.length - 1]] = value;
  return out;
}

function EditableInPreview({
  Tag,
  className,
  fieldPath,
  multiline,
  widgetUid,
  widgetSettings,
  children,
  focusOnMount = false,
  onBlur
}: PreviewProps): React.ReactElement {
  const ref = useRef<HTMLElement | null>(null);
  const isFocused = useRef(false);

  // Inject the hover/focus outline stylesheet once per iframe document.
  useEffect(() => {
    ensureEditableStyleInjected();
  }, []);

  // When a wrapper mounts us in response to a click (click-to-edit), grab
  // focus and drop the caret at the end so the user can type immediately.
  // Runs after the innerText-sync layout effect below, so the element
  // already holds the text.
  useEffect(() => {
    if (!focusOnMount || !ref.current) return;
    const el = ref.current;
    el.focus();
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  // Sync from prop only when the user isn't typing — preserves cursor.
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (isFocused.current) return;
    if (ref.current.innerText !== children) {
      ref.current.innerText = children;
    }
  }, [children]);

  // V3: emit on debounced input AND on blur. The bridge updates state
  // without reloading the iframe, and `EditableInPreview` skips the
  // imperative innerText sync while focused, so a mid-typing data-update
  // doesn't disrupt the cursor. Debounce keeps the save cadence sane:
  // one POST per ~250ms idle, plus a final flush on blur.
  //
  // Declared BEFORE handleBlur because handleBlur lists it in its
  // dependency array — accessing the const before initialization throws
  // a ReferenceError (temporal dead zone) on first render.
  const inputDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushSettings = useCallback(
    (newValue: string) => {
      if (newValue === children) return;
      const newSettings = patchSettings(widgetSettings, fieldPath, newValue);
      postToParent({
        type: 'inline-edit',
        widgetUid,
        fieldPath,
        value: newValue,
        settings: newSettings
      });
    },
    [children, widgetSettings, fieldPath, widgetUid]
  );

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    // Cancel any pending input debounce — we're flushing now so the
    // post is immediate.
    if (inputDebounceRef.current) {
      clearTimeout(inputDebounceRef.current);
      inputDebounceRef.current = null;
    }
    if (ref.current) {
      flushSettings(ref.current.innerText);
    }
    // Let a click-to-edit wrapper flip back to its formatted view.
    onBlur?.();
  }, [flushSettings, onBlur]);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLElement>) => {
      const text = (e.target as HTMLElement).innerText;
      if (inputDebounceRef.current) clearTimeout(inputDebounceRef.current);
      inputDebounceRef.current = setTimeout(() => {
        flushSettings(text);
      }, 250);
    },
    [flushSettings]
  );

  useEffect(() => {
    return () => {
      if (inputDebounceRef.current) clearTimeout(inputDebounceRef.current);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!multiline && e.key === 'Enter') {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (ref.current) ref.current.innerText = children;
        (e.target as HTMLElement).blur();
      }
    },
    [multiline, children]
  );

  // Strip pasted formatting — plain text only.
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return React.createElement(Tag, {
    ref,
    className,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    onPaste: handlePaste,
    'data-evershop-editable-field': fieldPath
  });
  // No children rendered by React — `useLayoutEffect` populates innerText
  // synchronously before paint, so there's no empty-element flicker.
}
