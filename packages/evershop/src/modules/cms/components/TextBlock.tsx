import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
import { WidgetEmptyState } from '@components/common/page-builder/index.js';
import React from 'react';

interface TextBlockProps {
  textWidget: {
    text: Row[];
    className: string;
  };
}
export default function TextBlock({
  textWidget: { text, className }
}: TextBlockProps) {
  // A freshly dropped text block has no rows — render an empty div on the live
  // storefront, but a helpful placeholder in the editor so it isn't invisible.
  const hasContent =
    Array.isArray(text) &&
    text.some((row) =>
      row?.columns?.some((col) => (col?.data?.blocks?.length ?? 0) > 0)
    );
  if (!hasContent) {
    return (
      <WidgetEmptyState
        type="text_block"
        title="Text block"
        hint="Open settings to write your copy."
      />
    );
  }
  return (
    <div className={`evershop-text-block text-block-widget ${className ?? ''}`}>
      <Editor rows={text} />
    </div>
  );
}

export const query = `
  query Query($text: String, $className: String) {
    textWidget(text: $text, className: $className) {
      ...TextBlockWidget
    }
  }
`;

export const fragments = `
  fragment TextBlockWidget on TextBlockWidget {
    text
    className
  }
`;

export const variables = `{
  text: getWidgetSetting("text"),
  className: getWidgetSetting("className")
}`;
