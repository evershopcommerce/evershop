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
import {
  LinkPicker,
  type LinkKind
} from '@components/common/page-builder/pickers/LinkPicker.js';
import { useWidgetSettings } from '@components/common/page-builder/WidgetContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CatalogUrn, CmsUrn, UrnService } from '@evershop/evershop/lib/urn';
import React from 'react';
import uniqid from 'uniqid';

/**
 * One menu entry. `type`/`uuid` are legacy fields kept for backward compat:
 * items saved before the LinkPicker switch only carry `{ type, uuid }` (no
 * URN in `url`), and the resolver still synthesizes a URN from them. New
 * picks keep both in sync. `newTab`/`nofollow`/`noReferrer` are the optional
 * link attributes (absent on legacy items → treated as false).
 */
interface MenuItem {
  id: string;
  name: string;
  url: string;
  type: string;
  uuid: string;
  newTab?: boolean;
  nofollow?: boolean;
  noReferrer?: boolean;
  children: MenuItem[];
}

// Legacy → LinkPicker value: a stored URN / custom URL, or a URN synthesized
// from the legacy `{ type, uuid }` shape so the picker re-opens on the right
// tab with the entity already selected.
function toLinkValue(item: MenuItem): string {
  if (item.url && UrnService.isValid(item.url)) return item.url;
  if (item.type === 'category' && item.uuid) return CatalogUrn.category(item.uuid);
  if (item.type === 'page' && item.uuid) return CmsUrn.page(item.uuid);
  if (item.type === 'product' && item.uuid) return CatalogUrn.product(item.uuid);
  return item.url || '';
}

function initialKindOf(item: MenuItem): LinkKind {
  return item.type === 'category' ||
    item.type === 'page' ||
    item.type === 'product'
    ? (item.type as LinkKind)
    : 'custom';
}

// Patch produced when a link is (re)picked. Keeps `type`/`uuid` aligned with
// the URN (legacy-reader + resolver fallback compat) and seeds the display
// name from the entity only when the merchant hasn't typed one.
function linkPatch(
  next: { url: string; kind: LinkKind; label?: string },
  prevName: string
): Partial<MenuItem> {
  return {
    url: next.url,
    type: next.kind,
    uuid: UrnService.isValid(next.url)
      ? UrnService.parse(next.url).uuid
      : next.url,
    name: prevName && prevName.trim() ? prevName : next.label ?? prevName
  };
}

function makeBlankItem(): MenuItem {
  return {
    id: uniqid(),
    name: 'New item',
    url: '/',
    type: 'custom',
    uuid: '',
    newTab: false,
    nofollow: false,
    noReferrer: false,
    children: []
  };
}

/**
 * Shared body for an item / sub-item row: name + link picker + the three
 * link-attribute toggles. `onPatch` merges a partial back into the right
 * place (top-level item or child).
 */
function LinkFields({
  item,
  onPatch
}: {
  item: MenuItem;
  onPatch: (patch: Partial<MenuItem>) => void;
}) {
  return (
    <>
      <Field label={_('Display name')}>
        <input
          type="text"
          value={item.name || ''}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder={_('Shop')}
          className={drawerInputClass}
        />
      </Field>
      <Field label={_('Target')} hint={_('Page, category, product, or a custom URL.')}>
        <LinkPicker
          value={toLinkValue(item)}
          initialKind={initialKindOf(item)}
          onChange={(next) => onPatch(linkPatch(next, item.name))}
        />
      </Field>
      <Toggle
        label={_('Open in new tab')}
        checked={!!item.newTab}
        onChange={(v) => onPatch({ newTab: v })}
      />
      <Toggle
        label={_('Nofollow')}
        description={_(
          "SEO: don't pass ranking credit to this link (rel=nofollow)."
        )}
        checked={!!item.nofollow}
        onChange={(v) => onPatch({ nofollow: v })}
      />
      <Toggle
        label={_('No referrer')}
        description={_(
          'Privacy: drop the referring URL (rel=noreferrer). New-tab links always include this.'
        )}
        checked={!!item.noReferrer}
        onChange={(v) => onPatch({ noReferrer: v })}
      />
    </>
  );
}

interface BasicMenuSettingProps {
  // Optional: the page-builder drawer mounts this without GraphQL props.
  basicMenuWidget?: {
    menus?: MenuItem[];
    isMain?: boolean;
    className?: string;
  };
}

export default function BasicMenuSetting({
  basicMenuWidget
}: BasicMenuSettingProps) {
  const { register, setValue, watch, getValues } = useScopedFormContext();
  // WidgetContext is the reliable settings source in the page-builder drawer
  // (no per-widget GraphQL query is merged there); the GraphQL prop is the
  // standalone widgetEdit page's source. Either way we coerce to an array —
  // the legacy editor seeds list settings as a JSON string.
  const widgetSettings = useWidgetSettings();
  const initialMenus = asArray<MenuItem>(
    basicMenuWidget?.menus ?? (widgetSettings.menus as MenuItem[] | undefined),
    []
  );
  const initialIsMain =
    basicMenuWidget?.isMain ?? Boolean(widgetSettings.isMain ?? false);
  const initialClassName =
    basicMenuWidget?.className ??
    ((widgetSettings.className as string | undefined) ?? '');

  const menus = useArraySetting<MenuItem>('settings.menus', initialMenus);
  const isMainV = Boolean(watch('settings.isMain') ?? initialIsMain);

  // Mutators read live form state via getValues so back-to-back edits don't
  // clobber one another (same pattern as the footer-menu widget).
  const readMenus = (): MenuItem[] =>
    asArray<MenuItem>(getValues('settings.menus'), initialMenus);

  const setMenus = (next: MenuItem[]) =>
    setValue('settings.menus', next, { shouldDirty: true });

  const updateItem = (i: number, patch: Partial<MenuItem>) =>
    setMenus(readMenus().map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const moveItem = (from: number, to: number) => {
    const cur = readMenus();
    if (to < 0 || to >= cur.length) return;
    const next = cur.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setMenus(next);
  };
  const removeItem = (i: number) =>
    setMenus(readMenus().filter((_, idx) => idx !== i));
  const addItem = () => setMenus([...readMenus(), makeBlankItem()]);

  const childrenOf = (item: MenuItem): MenuItem[] => asArray(item.children, []);

  const updateChild = (i: number, ci: number, patch: Partial<MenuItem>) => {
    const item = readMenus()[i];
    if (!item) return;
    updateItem(i, {
      children: childrenOf(item).map((c, idx) =>
        idx === ci ? { ...c, ...patch } : c
      )
    });
  };
  const moveChild = (i: number, from: number, to: number) => {
    const item = readMenus()[i];
    if (!item) return;
    const kids = childrenOf(item);
    if (to < 0 || to >= kids.length) return;
    const next = kids.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateItem(i, { children: next });
  };
  const removeChild = (i: number, ci: number) => {
    const item = readMenus()[i];
    if (!item) return;
    updateItem(i, {
      children: childrenOf(item).filter((_, idx) => idx !== ci)
    });
  };
  const addChild = (i: number) => {
    const item = readMenus()[i];
    if (!item) return;
    updateItem(i, { children: [...childrenOf(item), makeBlankItem()] });
  };

  return (
    <div className="space-y-3">
      <Section title={_('Menu items')}>
        <RepeatableAccordion<MenuItem>
          items={menus}
          onAdd={addItem}
          onRemove={removeItem}
          onMove={moveItem}
          addLabel={_('Add menu item')}
          minItems={0}
          initiallyOpenFirst
          renderHeader={({ item }) =>
            `${item.name || _('Untitled')}${
              childrenOf(item).length > 0
                ? ` · ${childrenOf(item).length} sub`
                : ''
            }`
          }
          renderItem={({ item, index }) => (
            <>
              <LinkFields
                item={item}
                onPatch={(patch) => updateItem(index, patch)}
              />
              <Field
                label={_('Sub-items')}
                hint={_('Optional dropdown links (1 level).')}
              >
                <RepeatableAccordion<MenuItem>
                  items={childrenOf(item)}
                  onAdd={() => addChild(index)}
                  onRemove={(ci) => removeChild(index, ci)}
                  onMove={(f, t) => moveChild(index, f, t)}
                  addLabel={_('Add sub-item')}
                  minItems={0}
                  renderHeader={({ item: child }) => child.name || _('Untitled')}
                  renderItem={({ item: child, index: ci }) => (
                    <LinkFields
                      item={child}
                      onPatch={(patch) => updateChild(index, ci, patch)}
                    />
                  )}
                />
              </Field>
            </>
          )}
        />
      </Section>

      <Section title={_('Options')}>
        <Toggle
          label={_('Use as main menu')}
          description={_(
            'Primary navigation — on mobile it collapses into a hamburger menu. Turn off for a simple link list (e.g. a footer), which stays inline on mobile.'
          )}
          checked={isMainV}
          onChange={(v) => setValue('settings.isMain', v, { shouldDirty: true })}
        />
        <Field
          label={_('Custom CSS classes')}
          hint={_('Applied to the rendered menu element.')}
        >
          <input
            type="text"
            {...register('settings.className')}
            defaultValue={initialClassName}
            placeholder={_('e.g. main-nav font-semibold')}
            className={drawerInputClass}
          />
        </Field>
      </Section>

      {/* Keeps the standalone widgetEdit form (no drawer auto-save) submitting
          the latest menus on Save. */}
      <input
        type="hidden"
        {...register('settings.menus')}
        defaultValue={JSON.stringify(initialMenus)}
      />
    </div>
  );
}

export const query = `
  query Query($settings: JSON) {
    basicMenuWidget(settings: $settings) {
      menus {
        id
        name
        url
        type
        uuid
        newTab
        nofollow
        noReferrer
        children {
          id
          name
          url
          type
          uuid
          newTab
          nofollow
          noReferrer
        }
      }
      isMain
      className
    }
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;
