import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import {
  Editable,
  EditableMarkdown
} from '@components/common/page-builder/index.js';
import React from 'react';

/**
 * FAQ block — a flexible mix of prose sections (rendered through the
 * existing EditorJS renderer) and accordion FAQ groups. Editorial copy
 * and Q&A live in the same widget so the homepage doesn't fragment into
 * twelve small ones.
 *
 * Prose: takes `content` as the EditorJS Row[] shape used by the
 * text-block widget — same renderer keeps visual consistency.
 *
 * FAQ items: native `<details>` / `<summary>` so keyboard + screen
 * reader work for free. The "single open at a time" mode is layered on
 * via a tiny inline script — no React hydration boundary required.
 */

export type FaqMaxWidth = 'narrow' | 'normal' | 'wide';

interface ProseSection {
  id: string;
  type: 'prose';
  content: Row[] | string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqSection {
  id: string;
  type: 'faq';
  heading: string | null;
  items: FaqItem[];
}

export type FaqSection_ = ProseSection | FaqSection;

export interface FaqBlockProps {
  faqBlockWidget: {
    heading: string | null;
    sections: FaqSection_[];
    maxWidth: FaqMaxWidth | null;
    allowMultipleOpen: boolean | null;
  };
}

const MAX_WIDTH_CLASS: Record<FaqMaxWidth, string> = {
  narrow: 'max-w-[560px]',
  normal: 'max-w-[720px]',
  wide: 'max-w-none'
};

function normalizeProse(content: Row[] | string): Row[] {
  if (Array.isArray(content)) return content;
  if (typeof content !== 'string' || !content.trim()) return [];
  const trimmed = content.trim();
  if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? (parsed as Row[]) : [];
  } catch {
    return [];
  }
}

// Progressive-enhancement script body. Closes sibling <details> when one
// opens, scoped to the immediate FAQ group container (so a prose section
// next to it stays open). Inlined as a string so SSR ships it without
// adding a hydration boundary.
const SINGLE_OPEN_SCRIPT = `(() => {
  document.querySelectorAll('[data-evershop-faq-group][data-single-open="true"]').forEach((group) => {
    group.addEventListener('toggle', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      group.querySelectorAll('details').forEach((d) => {
        if (d !== target && d.open) d.open = false;
      });
    }, true);
  });
})();`;

export default function FaqBlock({ faqBlockWidget }: FaqBlockProps) {
  const { heading, sections = [], maxWidth, allowMultipleOpen } = faqBlockWidget;
  const widthClass = MAX_WIDTH_CLASS[maxWidth ?? 'normal'];
  const singleOpen = allowMultipleOpen === false;

  if (!Array.isArray(sections) || sections.length === 0) return null;

  return (
    <div className={`evershop-faq-block mx-auto ${widthClass} py-6 md:py-10`}>
      {heading && (
        <Editable
          as="h2"
          fieldPath="settings.heading"
          className="evershop-faq-block__heading mb-4 text-2xl font-semibold tracking-tight"
        >
          {heading}
        </Editable>
      )}
      <div className="evershop-faq-block__sections space-y-6">
        {sections.map((section, sectionIdx) => {
          if (section.type === 'prose') {
            return (
              <div key={section.id} className="evershop-faq-block__section evershop-faq-block__section--prose prose max-w-none">
                <Editor rows={normalizeProse(section.content)} />
              </div>
            );
          }
          return (
            <div
              key={section.id}
              data-evershop-faq-group
              data-single-open={singleOpen ? 'true' : 'false'}
              className="evershop-faq-block__section evershop-faq-block__section--faq"
            >
              {section.heading && (
                <Editable
                  as="h3"
                  fieldPath={`settings.sections.${sectionIdx}.heading`}
                  className="evershop-faq-block__subheading mb-2 text-lg font-semibold"
                >
                  {section.heading}
                </Editable>
              )}
              <div className="evershop-faq-block__cards divide-y divide-divider rounded-md border border-divider">
                {(section.items ?? []).map((item, itemIdx) => (
                  <details
                    key={item.id}
                    className="evershop-faq-block__card group px-3 py-3"
                  >
                    <summary className="evershop-faq-block__question flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                      <Editable
                        as="span"
                        fieldPath={`settings.sections.${sectionIdx}.items.${itemIdx}.question`}
                      >
                        {item.question}
                      </Editable>
                      <span
                        aria-hidden="true"
                        className="evershop-faq-block__chevron text-xs text-muted-foreground transition-transform group-open:rotate-90"
                      >
                        ▶
                      </span>
                    </summary>
                    <EditableMarkdown
                      as="div"
                      fieldPath={`settings.sections.${sectionIdx}.items.${itemIdx}.answer`}
                      className="evershop-faq-block__answer mt-2 text-sm text-foreground/80"
                    >
                      {item.answer}
                    </EditableMarkdown>
                  </details>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {singleOpen && (
        <script
           
          dangerouslySetInnerHTML={{ __html: SINGLE_OPEN_SCRIPT }}
        />
      )}
    </div>
  );
}

export const query = `
  query Query(
    $heading: String
    $sections: JSON
    $maxWidth: String
    $allowMultipleOpen: Boolean
  ) {
    faqBlockWidget(
      heading: $heading
      sections: $sections
      maxWidth: $maxWidth
      allowMultipleOpen: $allowMultipleOpen
    ) {
      heading
      sections
      maxWidth
      allowMultipleOpen
    }
  }
`;

export const variables = `{
  heading: getWidgetSetting("heading"),
  sections: getWidgetSetting("sections", []),
  maxWidth: getWidgetSetting("maxWidth", "normal"),
  allowMultipleOpen: getWidgetSetting("allowMultipleOpen", false)
}`;
