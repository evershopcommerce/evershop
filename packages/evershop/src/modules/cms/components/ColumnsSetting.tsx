 
import { useScopedFormContext } from '@components/common/page-builder/WidgetSettingsScope.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Drawer-style helpers — same vocabulary as the other widget setting drawers
// (compact 11px label Field, collapsible Section card). Local for now.
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="text-[11px] font-semibold tracking-wide text-foreground/80">
          {label}
        </div>
      )}
      <div>{children}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Section({
  title,
  children,
  rightSlot
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border border-divider bg-card">
      <div className="flex w-full items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          {title}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
              open ? '' : '-rotate-90'
            }`}
          />
        </button>
        {rightSlot}
      </div>
      {open && (
        <div className="space-y-3 border-t border-divider px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

// Slider with local display state — controlled rAF/round-trip latency would
// make dragging feel like a click otherwise (same bug we hit on slideshow).
function Slider({
  value,
  min,
  max,
  step = 1,
  onCommit,
  unit
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (v: number) => void;
  unit?: string;
}) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    setDisplay(value);
  }, [value]);
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={display}
        onChange={(e) => setDisplay(Number(e.target.value))}
        onMouseUp={() => onCommit(display)}
        onTouchEnd={() => onCommit(display)}
        onKeyUp={() => onCommit(display)}
        className="flex-1 accent-primary"
      />
      <div className="min-w-12 text-right text-xs tabular-nums text-foreground">
        {display}
        {unit}
      </div>
    </div>
  );
}

// Segmented control (used for padding).
function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex w-full rounded-md border border-divider bg-muted/30 p-1"
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ratio presets. Sorted by column count so the picker reads as a progression.
// SVG-ish previews are pure flex divs — cheaper than an SVG and inherit
// theming.
// ---------------------------------------------------------------------------

interface RatioPreset {
  value: string;
  label: string;
  parts: number[];
}

const RATIO_PRESETS: ReadonlyArray<RatioPreset> = [
  { value: '1', label: '1', parts: [1] },
  { value: '1-1', label: '1 : 1', parts: [1, 1] },
  { value: '1-2', label: '1 : 2', parts: [1, 2] },
  { value: '2-1', label: '2 : 1', parts: [2, 1] },
  { value: '1-1-1', label: '1 : 1 : 1', parts: [1, 1, 1] },
  { value: '2-1-1', label: '2 : 1 : 1', parts: [2, 1, 1] },
  { value: '1-2-1', label: '1 : 2 : 1', parts: [1, 2, 1] },
  { value: '1-1-2', label: '1 : 1 : 2', parts: [1, 1, 2] },
  { value: '1-1-1-1', label: '1 : 1 : 1 : 1', parts: [1, 1, 1, 1] }
];

function RatioTile({
  preset,
  active,
  onClick
}: {
  preset: RatioPreset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={preset.label}
      aria-pressed={active}
      className={`group flex flex-col items-stretch gap-2 rounded-md border p-2 text-left transition-colors ${
        active
          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/40'
          : 'border-divider hover:bg-muted/40'
      }`}
    >
      <div className="flex h-8 items-stretch gap-1">
        {preset.parts.map((p, i) => (
          <div
            key={i}
            style={{ flex: p }}
            className={`rounded-sm ${
              active
                ? 'bg-primary/70'
                : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>
      <div
        className={`text-[10px] font-medium tabular-nums ${
          active ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {preset.label}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Background swatches. "None" is the first option (empty string) so picking
// it round-trips the field to null on the server.
// ---------------------------------------------------------------------------

const BG_SWATCHES: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: _('None') },
  { value: '#ffffff', label: _('White') },
  { value: '#f7f7f7', label: _('Light gray') },
  { value: '#111827', label: _('Charcoal') },
  { value: '#fef3c7', label: _('Cream') },
  { value: '#dbeafe', label: _('Sky') },
  { value: '#dcfce7', label: _('Mint') },
  { value: '#fee2e2', label: _('Blush') }
];

const PADDING_OPTIONS: ReadonlyArray<{ value: PaddingPreset; label: string }> =
  [
    { value: 'none', label: _('None') },
    { value: 'sm', label: _('S') },
    { value: 'md', label: _('M') },
    { value: 'lg', label: _('L') },
    { value: 'xl', label: _('XL') }
  ];

type PaddingPreset = 'none' | 'sm' | 'md' | 'lg' | 'xl';

type ColumnAnchor =
  | 'tl'
  | 'tc'
  | 'tr'
  | 'ml'
  | 'mc'
  | 'mr'
  | 'bl'
  | 'bc'
  | 'br';

const ANCHOR_CELLS: ReadonlyArray<ColumnAnchor> = [
  'tl',
  'tc',
  'tr',
  'ml',
  'mc',
  'mr',
  'bl',
  'bc',
  'br'
];

// 3×3 dot-grid anchor picker. Same shape and interaction as the Slideshow
// drawer's anchor picker; the widget applies the chosen anchor uniformly
// to all columns.
function AnchorPicker({
  value,
  onChange
}: {
  value: ColumnAnchor;
  onChange: (v: ColumnAnchor) => void;
}) {
  return (
    <div className="inline-grid grid-cols-3 gap-1 rounded-md border border-divider bg-muted/30 p-2">
      {ANCHOR_CELLS.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={_('Position ${c}', { c: c.toUpperCase() })}
            title={c.toUpperCase()}
            className={`h-6 w-6 rounded transition-colors ${
              active
                ? 'bg-primary'
                : 'bg-card border border-divider hover:border-primary/40'
            }`}
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full ${
                active ? 'bg-card' : 'bg-muted-foreground/60'
              } mx-auto`}
            />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------

interface ColumnsSettingProps {
  // Optional: page-builder drawer mounts this without GraphQL props.
  columnsWidget?: {
    columnCount?: number;
    gap?: number;
    ratio?: string | null;
    background?: string | null;
    padding?: string | null;
    contentPosition?: ColumnAnchor | null;
  };
}

export default function ColumnsSetting({
  columnsWidget
}: ColumnsSettingProps) {
  const {
    columnCount = 2,
    gap = 16,
    ratio = null,
    background = null,
    padding = 'none',
    contentPosition = 'mc'
  } = columnsWidget ?? {};

  const { register, watch, setValue } = useScopedFormContext();

  // The ratio is the authoritative layout descriptor; columnCount is derived
  // and kept only for back-compat with widgets stored before ratio existed.
  // Default falls back to "1-1" so two-column widgets keep their look without
  // a migration.
  const watchedRatio = (watch('settings.ratio') ?? null) as string | null;
  const watchedGap = watch('settings.gap');
  const watchedBg = (watch('settings.background') ?? '') as string;
  const watchedPadding = (watch('settings.padding') ?? padding ?? 'none') as
    | PaddingPreset
    | string;
  const watchedAnchor = (watch('settings.contentPosition') ??
    contentPosition ??
    'mc') as ColumnAnchor;

  const effectiveRatio: string =
    typeof watchedRatio === 'string' && watchedRatio.length > 0
      ? watchedRatio
      : ratio ||
        Array.from({ length: Math.max(1, columnCount || 2) }, () => '1').join(
          '-'
        );

  const effectiveGap =
    typeof watchedGap === 'number'
      ? watchedGap
      : typeof watchedGap === 'string'
      ? Number(watchedGap) || gap
      : gap;

  const effectivePadding: PaddingPreset = (
    typeof watchedPadding === 'string' && watchedPadding.length > 0
      ? watchedPadding
      : padding ?? 'none'
  ) as PaddingPreset;

  const handlePickRatio = (next: string) => {
    setValue('settings.ratio', next, { shouldDirty: true });
    // Keep `columnCount` in sync — older storefront consumers and the legacy
    // edit form may still read it before the ratio rolls out everywhere.
    const parts = next.split('-').filter(Boolean);
    setValue('settings.columnCount', parts.length, { shouldDirty: true });
  };

  const handlePickBg = (next: string) => {
    // Empty string clears the field; resolver maps that to null at the
    // GraphQL boundary.
    setValue('settings.background', next, { shouldDirty: true });
  };

  // Custom hex input — kept separate from the swatch grid so picking a swatch
  // doesn't have to update an additional piece of UI state.
  const isCustomBg =
    watchedBg.length > 0 && !BG_SWATCHES.some((s) => s.value === watchedBg);

  return (
    <div className="space-y-3">
      {/* Layout (ratio) */}
      <Section title={_('Layout')}>
        <Field
          label={_('Column layout')}
          hint={_(
            'Drag widgets into each column. Children re-flow when you change the ratio.'
          )}
        >
          <div className="grid grid-cols-3 gap-2">
            {RATIO_PRESETS.map((p) => (
              <RatioTile
                key={p.value}
                preset={p}
                active={effectiveRatio === p.value}
                onClick={() => handlePickRatio(p.value)}
              />
            ))}
          </div>
        </Field>
        <Field label={_('Gap')} hint={_('Space between columns.')}>
          <Slider
            value={effectiveGap}
            min={0}
            max={80}
            unit="px"
            onCommit={(v) =>
              setValue('settings.gap', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field
          label={_('Content position')}
          hint={_(
            'Where content sits within each column. Applied uniformly to every column.'
          )}
        >
          <AnchorPicker
            value={watchedAnchor}
            onChange={(v) =>
              setValue('settings.contentPosition', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      {/* Row appearance */}
      <Section title={_('Row appearance')}>
        <Field label={_('Background')}>
          <div className="grid grid-cols-4 gap-2">
            {BG_SWATCHES.map((s) => {
              const active = (watchedBg || '') === s.value;
              return (
                <button
                  key={s.value || 'none'}
                  type="button"
                  onClick={() => handlePickBg(s.value)}
                  title={s.label}
                  aria-pressed={active}
                  className={`relative flex h-8 items-center justify-center rounded-md border text-[10px] transition-all ${
                    active
                      ? 'ring-2 ring-primary/60 border-primary/60'
                      : 'border-divider hover:border-foreground/30'
                  }`}
                  style={
                    s.value
                      ? { backgroundColor: s.value }
                      : {
                          backgroundImage:
                            // Diagonal "empty" striping so the None tile reads.
                            'repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,0.06) 4px 8px)'
                        }
                  }
                >
                  <span
                    className={`px-1 rounded ${
                      s.value
                        ? 'bg-black/40 text-white'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field
          label={_('Custom color')}
          hint={_(
            'Any CSS color (e.g. "#0a0a0a" or "rgb(10,10,10)"). Leave empty to use the swatch above.'
          )}
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isCustomBg ? watchedBg : '#ffffff'}
              onChange={(e) => handlePickBg(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-divider bg-transparent"
            />
            <input
              type="text"
              value={isCustomBg ? watchedBg : ''}
              onChange={(e) => handlePickBg(e.target.value)}
              placeholder="#000000"
              className="flex-1 rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </Field>
        <Field
          label={_('Padding')}
          hint={_('Outer spacing around the row. Scales down on mobile.')}
        >
          <Segmented<PaddingPreset>
            value={effectivePadding}
            options={PADDING_OPTIONS}
            onChange={(v) =>
              setValue('settings.padding', v, { shouldDirty: true })
            }
          />
        </Field>
      </Section>

      {/* Hidden mirrors so the standalone widgetEdit `<form>` posts these
          values on Save. Drawer auto-save reads from form state directly. */}
      <input
        type="hidden"
        {...register('settings.ratio')}
        defaultValue={effectiveRatio}
      />
      <input
        type="hidden"
        {...register('settings.columnCount', { valueAsNumber: true })}
        defaultValue={effectiveRatio.split('-').length || columnCount}
      />
      <input
        type="hidden"
        {...register('settings.gap', { valueAsNumber: true })}
        defaultValue={effectiveGap}
      />
      <input
        type="hidden"
        {...register('settings.background')}
        defaultValue={background ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.padding')}
        defaultValue={effectivePadding}
      />
      <input
        type="hidden"
        {...register('settings.contentPosition')}
        defaultValue={watchedAnchor}
      />
    </div>
  );
}

export const query = `
  query Query(
    $columnCount: Int
    $gap: Float
    $ratio: String
    $background: String
    $padding: String
    $contentPosition: String
  ) {
    columnsWidget(
      columnCount: $columnCount
      gap: $gap
      ratio: $ratio
      background: $background
      padding: $padding
      contentPosition: $contentPosition
    ) {
      columnCount
      gap
      ratio
      background
      padding
      contentPosition
    }
  }
`;

export const variables = `{
  columnCount: getWidgetSetting("columnCount", 2),
  gap: getWidgetSetting("gap", 16),
  ratio: getWidgetSetting("ratio"),
  background: getWidgetSetting("background"),
  padding: getWidgetSetting("padding"),
  contentPosition: getWidgetSetting("contentPosition")
}`;
