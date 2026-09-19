import { drawerTextareaClass } from '@components/common/page-builder/drawer/index.js';
import React from 'react';

/**
 * Plain `<textarea>` for widget body fields that support the limited inline
 * markdown subset (`**bold**`, `_italic_`, line break). The matching
 * storefront renderer is `lib/util/markdownInline.ts`.
 *
 * Not a rich editor — that's `@components/common/Editor.js`, used by faq
 * prose sections and CMS pages. This field is intentionally lightweight so
 * the drawer stays performant when many of them mount at once.
 */

export interface MarkdownBodyFieldProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  /** Optional soft cap shown in the hint. Not enforced. */
  softLimit?: number;
}

export function MarkdownBodyField({
  value,
  onChange,
  placeholder,
  rows = 3,
  softLimit
}: MarkdownBodyFieldProps) {
  const length = value?.length ?? 0;
  const overSoft = softLimit ? length > softLimit : false;
  return (
    <div className="space-y-1">
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={drawerTextareaClass}
      />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Supports <code>**bold**</code>, <code>_italic_</code>, and line
          breaks.
        </span>
        {softLimit && (
          <span className={overSoft ? 'text-amber-600' : undefined}>
            {length}/{softLimit}
          </span>
        )}
      </div>
    </div>
  );
}
