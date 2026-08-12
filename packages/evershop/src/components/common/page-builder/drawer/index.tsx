 
import { Switch } from '@components/common/ui/Switch.js';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';

/**
 * Drawer-style primitives shared by every widget setting form. Same vocabulary
 * across the codebase: an 11px-label `Field`, a collapsible `Section` card,
 * a `Segmented` radio-style control, and a `Slider` whose drag commits on
 * release (controlled-value updates on every frame made dragging feel like
 * a click — see slideshow drawer history).
 *
 * Until this module landed, every drawer (Slideshow / Banner / Menu /
 * Collection / Columns) inlined its own copies. Behaviour now flows from
 * here; the per-widget files just compose these.
 */

// ---------------------------------------------------------------------------
// Field — label + (hint) + child input.
// ---------------------------------------------------------------------------

export function Field({
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

// ---------------------------------------------------------------------------
// Section — collapsible card with a title row and optional right-slot.
// ---------------------------------------------------------------------------

export function Section({
  title,
  children,
  rightSlot,
  defaultOpen = true
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
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

// ---------------------------------------------------------------------------
// Segmented — generic radio-style row control. Each option can carry an
// optional leading icon; labels stay short.
// ---------------------------------------------------------------------------

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = 'sm'
}: {
  value: T;
  options: ReadonlyArray<{
    value: T;
    label: string;
    icon?: React.ReactNode;
    title?: string;
  }>;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  const padding = size === 'md' ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-xs';
  return (
    <div
      className="inline-flex w-full rounded-md border border-divider bg-muted/30 p-1"
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title ?? opt.label}
            onClick={() => onChange(opt.value)}
            className={`flex flex-1 items-center justify-center gap-2 rounded font-medium transition-colors ${padding} ${
              active
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slider — local display state, commit on mouse/touch/key release. The
// commit-on-release pattern avoids RHF round-trips during the drag (which
// produced the click-only behaviour we hit in the slideshow drawer).
// ---------------------------------------------------------------------------

export function Slider({
  value,
  min,
  max,
  step = 1,
  onCommit,
  unit,
  format
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (v: number) => void;
  unit?: string;
  format?: (v: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    setDisplay(value);
  }, [value]);
  const shown = format ? format(display) : `${display}${unit ?? ''}`;
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
        {shown}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle — a labelled row with a description and shadcn Switch on the right.
// Used heavily for boolean settings; the row pattern keeps the rhythm of the
// drawer consistent (matches Slideshow / Banner).
// ---------------------------------------------------------------------------

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-foreground">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground">{description}</div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TextInput — plain text input that matches drawer typography. Exposed as a
// helper so the surrounding setting components don't drift on padding/font.
// ---------------------------------------------------------------------------

export const drawerInputClass =
  'w-full rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary';

export const drawerTextareaClass =
  'w-full resize-vertical rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary';
