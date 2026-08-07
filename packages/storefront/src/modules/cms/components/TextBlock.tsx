import { Editor } from '@components/common/Editor.js';
import { Row } from '@components/common/form/Editor.js';
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
  return (
    <div className={`text-block-widget ${className}`}>
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
