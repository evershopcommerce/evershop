import {
  ColorSwatchField,
  Field,
  Section,
  Segmented,
  Toggle,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type { SeparatorSize } from './Separator.js';

interface SeparatorSettingProps {
  separatorWidget?: {
    size?: SeparatorSize | null;
    showLine?: boolean | null;
    lineColor?: string | null;
  };
}

const SIZE_OPTIONS: ReadonlyArray<{ value: SeparatorSize; label: string }> = [
  { value: 'xs', label: _('XS') },
  { value: 'sm', label: _('S') },
  { value: 'md', label: _('M') },
  { value: 'lg', label: _('L') },
  { value: 'xl', label: _('XL') }
];

export default function SeparatorSetting({
  separatorWidget
}: SeparatorSettingProps) {
  const {
    size = 'md',
    showLine = false,
    lineColor = null
  } = separatorWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();

  const sizeV =
    ((watch('settings.size') as string) ?? size ?? 'md') as SeparatorSize;
  const showLineV =
    (watch('settings.showLine') as boolean | null) ?? showLine ?? false;
  const lineColorV =
    (watch('settings.lineColor') as string) ?? lineColor ?? '';

  return (
    <div className="space-y-3">
      <Section title={_('Spacing')}>
        <Field
          label={_('Size')}
          hint={_('Mobile scales down ~⅔ automatically.')}
        >
          <Segmented<SeparatorSize>
            value={sizeV}
            options={SIZE_OPTIONS}
            onChange={(v) =>
              setValue('settings.size', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      <Section title={_('Divider line')}>
        <Toggle
          label={_('Show divider line')}
          description={_('A horizontal rule centred in the spacing band.')}
          checked={showLineV}
          onChange={(v) =>
            setValue('settings.showLine', v, { shouldDirty: true })
          }
        />
        {showLineV && (
          <Field
            label={_('Line color')}
            hint={_("Default uses the theme's divider color.")}
          >
            <ColorSwatchField
              value={lineColorV}
              onChange={(v) =>
                setValue('settings.lineColor', v || null, {
                  shouldDirty: true
                })
              }
            />
          </Field>
        )}
      </Section>

      {/* Hidden mirrors so the standalone widgetEdit form posts these
          on Save. Drawer auto-save reads from form state directly. */}
      <input
        type="hidden"
        {...register('settings.size')}
        defaultValue={size ?? 'md'}
      />
      <input
        type="hidden"
        {...register('settings.showLine')}
        defaultValue={showLine ? 'true' : 'false'}
      />
      <input
        type="hidden"
        {...register('settings.lineColor')}
        defaultValue={lineColor ?? ''}
      />
    </div>
  );
}

export const query = `
  query Query($size: String, $showLine: Boolean, $lineColor: String) {
    separatorWidget(size: $size, showLine: $showLine, lineColor: $lineColor) {
      size
      showLine
      lineColor
    }
  }
`;

export const variables = `{
  size: getWidgetSetting("size", "md"),
  showLine: getWidgetSetting("showLine", false),
  lineColor: getWidgetSetting("lineColor")
}`;
