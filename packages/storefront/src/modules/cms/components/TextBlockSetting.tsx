import { Editor, Row } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import React from 'react';
import { useFormContext } from 'react-hook-form';

interface TextBlockSettingProps {
  textWidget: {
    text: Row[];
    className: string;
  };
}
export default function TextBlockSetting({
  textWidget: { text, className }
}: TextBlockSettingProps) {
  const { register, watch, setValue } = useFormContext();

  const editorValue = watch('temp_editor_text');

  React.useEffect(() => {
    if (editorValue) {
      setValue('settings.text', JSON.stringify(editorValue));
    }
  }, [editorValue, setValue]);

  return (
    <div>
      <InputField
        label="Custom CSS classes"
        name="settings.className"
        defaultValue={className}
        helperText="Custom CSS classes for the text block"
      />
      <input
        type="hidden"
        {...register('settings.text')}
        defaultValue={typeof text === 'string' ? text : JSON.stringify(text)}
      />
      <Editor
        name="temp_editor_text"
        label="Content"
        value={typeof text === 'string' ? JSON.parse(text) : text}
      />
    </div>
  );
}

export const query = `
  query Query($text: String, $className: String) {
    textWidget(text: $text, className: $className) {
      text
      className
    }
  }
`;

export const variables = `{
  text: getWidgetSetting("text"),
  className: getWidgetSetting("className")
}`;
