import {
  asArray,
  drawerInputClass,
  Field,
  RepeatableAccordion,
  Section,
  Toggle,
  useArraySetting,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type { FooterMenuColumn, FooterMenuLink } from './FooterMenu.js';

interface FooterMenuSettingProps {
  footerMenuWidget?: {
    columns?: FooterMenuColumn[];
  };
}

function makeId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeBlankLink(): FooterMenuLink {
  return {
    id: makeId('lnk'),
    label: _('New link'),
    url: '/',
    newTab: false,
    nofollow: false,
    noReferrer: false
  };
}

function makeBlankColumn(): FooterMenuColumn {
  return { id: makeId('col'), title: _('New column'), links: [makeBlankLink()] };
}

export default function FooterMenuSetting({
  footerMenuWidget
}: FooterMenuSettingProps) {
  const { columns: initialColumns = [] } = footerMenuWidget ?? {};

  const { register, setValue, getValues } = useScopedFormContext();

  // `useArraySetting` drives re-render and normalizes the form value to a real
  // array on mount (the legacy widget editor seeds list settings as a JSON
  // string). Mutators read the *live* form state via `getValues` so two edits
  // firing back-to-back don't clobber each other.
  const columns = useArraySetting<FooterMenuColumn>(
    'settings.columns',
    initialColumns
  );

  const readColumns = (): FooterMenuColumn[] =>
    asArray<FooterMenuColumn>(getValues('settings.columns'), initialColumns);

  const updateColumn = (i: number, patch: Partial<FooterMenuColumn>) => {
    const current = readColumns();
    const next = current.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    setValue('settings.columns', next, { shouldDirty: true });
  };
  const moveColumn = (from: number, to: number) => {
    const current = readColumns();
    if (to < 0 || to >= current.length) return;
    const next = current.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setValue('settings.columns', next, { shouldDirty: true });
  };
  const removeColumn = (i: number) => {
    const current = readColumns();
    if (current.length <= 1) return;
    setValue(
      'settings.columns',
      current.filter((_, idx) => idx !== i),
      { shouldDirty: true }
    );
  };
  const addColumn = () => {
    const current = readColumns();
    if (current.length >= 6) return;
    setValue('settings.columns', [...current, makeBlankColumn()], {
      shouldDirty: true
    });
  };

  const updateLink = (
    colIdx: number,
    linkIdx: number,
    patch: Partial<FooterMenuLink>
  ) => {
    const col = readColumns()[colIdx];
    if (!col) return;
    updateColumn(colIdx, {
      links: (col.links ?? []).map((l, i) =>
        i === linkIdx ? { ...l, ...patch } : l
      )
    });
  };
  const moveLink = (colIdx: number, from: number, to: number) => {
    const col = readColumns()[colIdx];
    if (!col) return;
    const links = col.links ?? [];
    if (to < 0 || to >= links.length) return;
    const next = links.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateColumn(colIdx, { links: next });
  };
  const removeLink = (colIdx: number, linkIdx: number) => {
    const col = readColumns()[colIdx];
    if (!col || (col.links ?? []).length <= 1) return;
    updateColumn(colIdx, {
      links: col.links.filter((_, i) => i !== linkIdx)
    });
  };
  const addLink = (colIdx: number) => {
    const col = readColumns()[colIdx];
    if (!col || (col.links ?? []).length >= 12) return;
    updateColumn(colIdx, { links: [...(col.links ?? []), makeBlankLink()] });
  };

  return (
    <div className="space-y-3">
      <Section title={_('Columns')}>
        <RepeatableAccordion<FooterMenuColumn>
          items={columns}
          onAdd={addColumn}
          onRemove={removeColumn}
          onMove={moveColumn}
          addLabel={_('Add column')}
          minItems={1}
          maxItems={6}
          initiallyOpenFirst
          renderHeader={({ item }) =>
            _('${title} · ${count} links', {
              title: item.title || _('Untitled'),
              count: String(item.links?.length ?? 0)
            })
          }
          renderItem={({ item, index }) => (
            <>
              <Field label={_('Column title')}>
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={(e) =>
                    updateColumn(index, { title: e.target.value })
                  }
                  placeholder={_('Shop')}
                  className={drawerInputClass}
                />
              </Field>
              <Field label={_('Links')} hint={_('Min 1, max 12.')}>
                <RepeatableAccordion<FooterMenuLink>
                  items={item.links ?? []}
                  onAdd={() => addLink(index)}
                  onRemove={(i) => removeLink(index, i)}
                  onMove={(f, t) => moveLink(index, f, t)}
                  addLabel={_('Add link')}
                  minItems={1}
                  maxItems={12}
                  renderHeader={({ item: link }) => link.label || _('Untitled')}
                  renderItem={({ item: link, index: linkIdx }) => (
                    <>
                      <Field label={_('Label')}>
                        <input
                          type="text"
                          value={link.label || ''}
                          onChange={(e) =>
                            updateLink(index, linkIdx, {
                              label: e.target.value
                            })
                          }
                          placeholder={_('New arrivals')}
                          className={drawerInputClass}
                        />
                      </Field>
                      <Field label={_('Link')}>
                        <LinkPicker
                          value={link.url || ''}
                          initialKind="custom"
                          onChange={({ url }) =>
                            updateLink(index, linkIdx, { url })
                          }
                        />
                      </Field>
                      <Toggle
                        label={_('Open in new tab')}
                        checked={!!link.newTab}
                        onChange={(v) =>
                          updateLink(index, linkIdx, { newTab: v })
                        }
                      />
                      <Toggle
                        label={_('Nofollow')}
                        description={_(
                          "SEO: don't pass ranking credit to this link (rel=nofollow)."
                        )}
                        checked={!!link.nofollow}
                        onChange={(v) =>
                          updateLink(index, linkIdx, { nofollow: v })
                        }
                      />
                      <Toggle
                        label={_('No referrer')}
                        description={_(
                          'Privacy: drop the referring URL (rel=noreferrer). New-tab links always include this.'
                        )}
                        checked={!!link.noReferrer}
                        onChange={(v) =>
                          updateLink(index, linkIdx, { noReferrer: v })
                        }
                      />
                    </>
                  )}
                />
              </Field>
            </>
          )}
        />
      </Section>

      <input
        type="hidden"
        {...register('settings.columns')}
        defaultValue={JSON.stringify(initialColumns)}
      />
    </div>
  );
}

export const query = `
  query Query($columns: JSON) {
    footerMenuWidget(columns: $columns) {
      columns
    }
  }
`;

export const variables = `{
  columns: getWidgetSetting("columns", [])
}`;
