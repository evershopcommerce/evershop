 
import { FileBrowser } from '@components/admin/FileBrowser.js';
// Aliased to avoid the name clash with the DOM `Image` constructor we use
// below to read natural dimensions on insert / mount.
import { Image as EvershopImage } from '@components/common/Image.js';
import { Button } from '@components/common/ui/Button.js';
import { ImagePlus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

/**
 * Form field wrapper around the admin FileBrowser modal. Exposes a plain
 * value/onChange API so widget setting forms can drop it next to other
 * fields without re-implementing the modal toggle, the thumbnail row, and
 * the path-normalisation defence (older FileBrowser builds emitted
 * `/assets//file.jpg`, double-slash and all).
 *
 * Callers wire it via react-hook-form's `Controller` or via the
 * `useScopedFormContext` setValue + watch pattern.
 */

export interface ImagePickerFieldProps {
  value: string;
  onChange: (next: string) => void;
  onLoadDimensions?: (dims: { width: number; height: number }) => void;
  /** Visual height of the thumbnail. Defaults to a 56-px tall preview. */
  thumbHeightClass?: string;
  /** Visual width of the thumbnail. Defaults to a 96-px wide preview. */
  thumbWidthClass?: string;
  /** "Select" / "Replace" button copy override. */
  selectLabel?: string;
  replaceLabel?: string;
  clearLabel?: string;
  /** When true, the picker renders only a button (no thumb row). */
  compact?: boolean;
}

const normalize = (raw: string): string =>
  // Defensive — older FileBrowser builds emitted `/assets//file.jpg`. Strip
  // any consecutive slashes (but keep the leading one).
  (raw || '').replace(/\/{2,}/g, '/');

export function ImagePickerField({
  value,
  onChange,
  onLoadDimensions,
  thumbHeightClass = 'h-14',
  thumbWidthClass = 'w-24',
  selectLabel = 'Select',
  replaceLabel = 'Replace',
  clearLabel = 'Clear',
  compact = false
}: ImagePickerFieldProps) {
  const [open, setOpen] = useState(false);
  // Display state for the "WIDTH × HEIGHT px" caption under the thumb.
  // Auto-detected from the current `value` whenever it changes, so the
  // dimensions show for both freshly-picked images AND for back-compat
  // widgets whose stored dimensions never got persisted to settings.
  const [dims, setDims] = useState<{ width: number; height: number } | null>(
    null
  );

  useEffect(() => {
    if (!value) {
      setDims(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setDims({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancelled) setDims(null);
    };
    img.src = value;
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handleInsert = (file: string) => {
    const next = normalize(file);
    onChange(next);
    setOpen(false);
    if (onLoadDimensions && next) {
      const img = new Image();
      img.onload = () =>
        onLoadDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      img.src = next;
    }
  };

  if (compact) {
    return (
      <>
        {open && (
          <div className="max-h-96">
            <FileBrowser
              isMultiple={false}
              onInsert={handleInsert}
              close={() => setOpen(false)}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
          >
            <ImagePlus className="mr-2 h-3.5 w-3.5" />
            {value ? replaceLabel : selectLabel}
          </Button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
              title={clearLabel}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {open && (
        <div className="max-h-96">
          <FileBrowser
            isMultiple={false}
            onInsert={handleInsert}
            close={() => setOpen(false)}
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-start gap-1">
          <div
            className={`relative ${thumbHeightClass} ${thumbWidthClass} shrink-0 overflow-hidden rounded border border-divider bg-muted/40 flex items-center justify-center`}
          >
            {value ? (
              <EvershopImage
                src={value}
                alt=""
                width={192}
                height={112}
                objectFit="cover"
                sizes="96px"
                className="h-full w-full"
                style={{ aspectRatio: 'auto' }}
              />
            ) : (
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          {value && dims && (
            <div className="text-[11px] tabular-nums text-muted-foreground">
              {dims.width} × {dims.height} px
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
          >
            {value ? replaceLabel : selectLabel}
          </Button>
          {value && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => onChange('')}
            >
              {clearLabel}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
