import React, { useEffect, useState } from 'react';
import { renderInlineMarkdown } from '../../../lib/util/markdownInline.js';
import { Editable } from './Editable.js';
import { isPageBuilderActive } from './pageBuilderMode.js';

/**
 * A body/copy field that supports lightweight inline markdown (`**bold**`,
 * `_italic_`, newlines — see `lib/util/markdownInline`).
 *
 * One field, two surfaces — and the page-builder canvas stays WYSIWYG:
 *   - Production storefront (and SSR / first client render): renders the
 *     FORMATTED markdown via `renderInlineMarkdown`.
 *   - Page-builder canvas, idle: ALSO renders the formatted markdown, so the
 *     canvas matches the live store (no raw `**bold**` on screen). Clicking it
 *     enters edit mode.
 *   - Page-builder canvas, editing: swaps to an `<Editable multiline>` over the
 *     RAW markdown source (the `<Editable>` primitive is plain-text only), so
 *     the merchant edits the markdown directly; on blur it flips back to the
 *     formatted view. So raw syntax is visible only for the one field you're
 *     actively editing.
 *
 * SSR-safe the same way `<Editable>` is: the first render always uses the
 * formatted path; page-builder mode is detected after mount.
 */
interface EditableMarkdownProps {
  /** Path under the widget's settings, e.g. "settings.body". */
  fieldPath: string;
  /** Tag to render. Default 'p'. */
  as?: React.ElementType;
  className?: string;
  /** Raw markdown source. */
  children: string;
}

export function EditableMarkdown({
  fieldPath,
  as: Tag = 'p',
  className,
  children
}: EditableMarkdownProps): React.ReactElement {
  // Defer page-builder detection until after mount so the first render is
  // identical between SSR and hydration (mirrors `<Editable>`).
  const [inPageBuilder, setInPageBuilder] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setInPageBuilder(isPageBuilderActive());
  }, []);

  // Formatted view: production always, and the page-builder canvas while idle
  // (click to start editing). Built via createElement so jsx-a11y doesn't flag
  // the click handler on a text element — this only renders inside the editor.
  if (!inPageBuilder || !editing) {
    return React.createElement(
      Tag,
      {
        className,
        ...(inPageBuilder
          ? { onClick: () => setEditing(true), style: { cursor: 'text' } }
          : {})
      },
      renderInlineMarkdown(children)
    );
  }

  // Editing view (page builder only): raw-markdown contenteditable; flip back
  // to the formatted view on blur.
  return (
    <Editable
      as={Tag}
      multiline
      focusOnMount
      fieldPath={fieldPath}
      className={className}
      onBlur={() => setEditing(false)}
    >
      {children}
    </Editable>
  );
}
