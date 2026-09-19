import {
  asArray,
  ColorSwatchField,
  drawerInputClass,
  Field,
  RepeatableAccordion,
  Section,
  Slider,
  Toggle,
  useArraySetting,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type { Announcement } from './AnnouncementBar.js';

interface AnnouncementBarSettingProps {
  announcementBarWidget?: {
    backgroundColor?: string;
    textColor?: string;
    delay?: number;
    announcements?: Announcement[];
  };
}

function makeBlankAnnouncement(): Announcement {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: 'New announcement',
    link: null
  };
}

export default function AnnouncementBarSetting({
  announcementBarWidget
}: AnnouncementBarSettingProps) {
  const {
    backgroundColor,
    textColor,
    delay,
    announcements: initialAnnouncements = []
  } = announcementBarWidget ?? {};

  const { register, setValue, watch, getValues } = useScopedFormContext();

  const backgroundColorV =
    (watch('settings.backgroundColor') as string) ?? backgroundColor ?? '#000000';
  const textColorV =
    (watch('settings.textColor') as string) ?? textColor ?? '#ffffff';
  const delayV = (watch('settings.delay') as number) ?? delay ?? 4000;
  const announcements = useArraySetting<Announcement>(
    'settings.announcements',
    initialAnnouncements
  );

  // Read live form state inside mutation helpers — prevents back-to-back
  // updates from racing each other through the stale-closure path.
  const readAnnouncements = (): Announcement[] =>
    asArray<Announcement>(
      getValues('settings.announcements'),
      initialAnnouncements
    );

  const updateItem = (i: number, patch: Partial<Announcement>) => {
    const current = readAnnouncements();
    const next = current.map((a, idx) =>
      idx === i ? { ...a, ...patch } : a
    );
    setValue('settings.announcements', next, { shouldDirty: true });
  };
  const moveItem = (from: number, to: number) => {
    const current = readAnnouncements();
    if (to < 0 || to >= current.length) return;
    const next = current.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue('settings.announcements', next, { shouldDirty: true });
  };
  const removeItem = (i: number) => {
    const current = readAnnouncements();
    if (current.length <= 1) return;
    setValue(
      'settings.announcements',
      current.filter((_, idx) => idx !== i),
      { shouldDirty: true }
    );
  };
  const addItem = () => {
    const current = readAnnouncements();
    setValue(
      'settings.announcements',
      [...current, makeBlankAnnouncement()],
      { shouldDirty: true }
    );
  };

  return (
    <div className="space-y-3">
      <Section title={_('Style')}>
        <Field label={_('Background color')}>
          <ColorSwatchField
            value={backgroundColorV}
            onChange={(v) =>
              setValue('settings.backgroundColor', v || '#000000', {
                shouldDirty: true
              })
            }
            allowEmpty={false}
          />
        </Field>
        <Field label={_('Text color')}>
          <ColorSwatchField
            value={textColorV}
            onChange={(v) =>
              setValue('settings.textColor', v || '#ffffff', {
                shouldDirty: true
              })
            }
            allowEmpty={false}
          />
        </Field>
        <Field
          label={_('Dwell time')}
          hint={_(
            'Time each announcement stays visible (in addition to the 400ms slide transition).'
          )}
        >
          <Slider
            value={delayV}
            min={1000}
            max={15000}
            step={500}
            unit="ms"
            onCommit={(v) =>
              setValue('settings.delay', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      <Section title={_('Announcements')}>
        <RepeatableAccordion<Announcement>
          items={announcements}
          onAdd={addItem}
          onRemove={removeItem}
          onMove={moveItem}
          addLabel={_('Add announcement')}
          minItems={1}
          initiallyOpenFirst
          renderHeader={({ item }) => item.content || _('Untitled')}
          renderItem={({ item, index }) => (
            <>
              <Field label={_('Content')}>
                <input
                  type="text"
                  value={item.content || ''}
                  onChange={(e) =>
                    updateItem(index, { content: e.target.value })
                  }
                  placeholder={_('Free shipping on orders over $50')}
                  className={drawerInputClass}
                />
              </Field>
              <Field
                label={_('Link')}
                hint={_('Optional. Makes the entire row a clickable link.')}
              >
                <LinkPicker
                  value={item.link?.url || ''}
                  onChange={({ url, label }) =>
                    updateItem(index, {
                      link: url
                        ? {
                            url,
                            label: item.link?.label || label || '',
                            newTab: item.link?.newTab ?? false
                          }
                        : null
                    })
                  }
                />
              </Field>
              {item.link && (
                <>
                  <Field
                    label={_('Link label')}
                    hint={_(
                      'Optional. Displayed after the content; defaults to the content itself.'
                    )}
                  >
                    <input
                      type="text"
                      value={item.link.label || ''}
                      onChange={(e) =>
                        updateItem(index, {
                          link: { ...item.link!, label: e.target.value }
                        })
                      }
                      placeholder={_('Shop now')}
                      className={drawerInputClass}
                    />
                  </Field>
                  <Toggle
                    label={_('Open in new tab')}
                    checked={item.link.newTab}
                    onChange={(v) =>
                      updateItem(index, {
                        link: { ...item.link!, newTab: v }
                      })
                    }
                  />
                </>
              )}
            </>
          )}
        />
      </Section>

      <input
        type="hidden"
        {...register('settings.announcements')}
        defaultValue={JSON.stringify(initialAnnouncements)}
      />
      <input
        type="hidden"
        {...register('settings.delay', { valueAsNumber: true })}
        defaultValue={delay ?? 4000}
      />
    </div>
  );
}

export const query = `
  query Query(
    $backgroundColor: String
    $textColor: String
    $delay: Float
    $announcements: JSON
  ) {
    announcementBarWidget(
      backgroundColor: $backgroundColor
      textColor: $textColor
      delay: $delay
      announcements: $announcements
    ) {
      backgroundColor
      textColor
      delay
      announcements
    }
  }
`;

export const variables = `{
  backgroundColor: getWidgetSetting("backgroundColor", "#000000"),
  textColor: getWidgetSetting("textColor", "#ffffff"),
  delay: getWidgetSetting("delay", 4000),
  announcements: getWidgetSetting("announcements", [])
}`;
