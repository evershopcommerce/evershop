import { Editor, Row } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface TextBlockSettingProps {
  // Optional: in the page-builder drawer this component is mounted via
  // <Area id="widget_setting_form"> without the per-widget GraphQL props
  // that the standalone widgetEdit page provides. Default to empty so the
  // component still mounts; the form's auto-save drives the real values.
  textWidget?: {
    text?: Row[] | string;
    className?: string;
  };
}
export default function TextBlockSetting({
  textWidget
}: TextBlockSettingProps) {
  const { text: propText, className = '' } = textWidget ?? {};
  const { register, watch, setValue, getValues } = useScopedFormContext();

  // Capture the initial text ONCE at mount.
  //
  // In the page-builder drawer `textWidget` is undefined (the component
  // mounts via <Area id="widget_setting_form"> without GraphQL props). The
  // form state already has the widget's existing settings, populated by the
  // page-builder Editor — we read it via `getValues` to seed the editor.
  //
  // An earlier attempt used `watch('settings.text')`, but the
  // `temp_editor_text → settings.text` sync below runs on every keystroke,
  // which would re-render this component on every keystroke and pass a
  // fresh `value` reference to <Editor>. <Editor>'s `useState(value.map...)`
  // only reads `value` once, but the cascading re-renders disrupted the
  // page-builder auto-save chain so the preview iframe only refreshed when
  // the drawer was closed (not while typing). A snapshot via `useState`
  // keeps the editor's input stable across edits and lets auto-save
  // propagate normally.
  const [initialText] = React.useState<Row[] | string>(() => {
    if (propText !== undefined) return propText;
    const fromForm = getValues('settings.text') as Row[] | string | undefined;
    return fromForm ?? '';
  });
  const text: Row[] | string = initialText;

  const editorValue = watch('temp_editor_text');

  React.useEffect(() => {
    if (editorValue) {
      setValue('settings.text', JSON.stringify(editorValue));
    }
  }, [editorValue, setValue]);

  // The Editor expects Row[]. `text` may arrive as a JSON-stringified array
  // (form-stored value), a real array (a default registered as a JS array),
  // or a plain string (a default registered as prose). Normalize defensively
  // so we never call JSON.parse on a non-JSON string and crash the panel.
  const editorRows: Row[] = (() => {
    if (Array.isArray(text)) return text as Row[];
    if (typeof text !== 'string' || !text.trim()) return [];
    const trimmed = text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? (parsed as Row[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  })();
  const hiddenTextDefault =
    typeof text === 'string' ? text : JSON.stringify(text);

  return (
    <div className="space-y-3">
      <InputField
        label={_('Custom CSS classes')}
        name="settings.className"
        defaultValue={className}
        helperText={_('Custom CSS classes for the text block')}
      />
      <input
        type="hidden"
        {...register('settings.text')}
        defaultValue={hiddenTextDefault}
      />
      <Editor
        name="temp_editor_text"
        label={_('Content')}
        value={editorRows}
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
