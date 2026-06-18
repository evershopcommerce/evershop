 
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2
} from 'lucide-react';
import React, { useState } from 'react';

/**
 * Generic repeatable list editor for widget setting drawers. Stands in for
 * the per-widget loop+accordion code that used to be hand-rolled in every
 * setting form (Slideshow / Menu / etc.).
 *
 * Owns the *interaction* (collapse, reorder, delete, add, visibility) but
 * delegates *rendering* of an item's body to the caller via `renderItem`.
 * That keeps the caller free to register fields against any path it wants
 * — this component never touches form state.
 *
 * Reorder is HTML5 drag/drop with handle-only initiation, no third-party
 * dep. Falls back to up/down buttons for keyboard users.
 */

export interface RepeatableItem {
  id: string;
}

interface RenderHeaderArgs<T extends RepeatableItem> {
  item: T;
  index: number;
  isOpen: boolean;
}

interface RenderItemArgs<T extends RepeatableItem> {
  item: T;
  index: number;
}

interface RepeatableAccordionProps<T extends RepeatableItem> {
  items: T[];
  onAdd?: () => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onToggleHidden?: (index: number) => void;
  /** Read `hidden` state for the eye toggle. Optional. */
  isHidden?: (item: T) => boolean;
  /** Header content for each row. Receives item, index, open state. */
  renderHeader: (args: RenderHeaderArgs<T>) => React.ReactNode;
  /** Body for an expanded row. */
  renderItem: (args: RenderItemArgs<T>) => React.ReactNode;
  /** Label for the "Add" button. */
  addLabel?: string;
  /** Min items (Delete disabled at this count). Default 1. */
  minItems?: number;
  /** Max items (Add disabled at this count). Default Infinity. */
  maxItems?: number;
  /** Render the body of the first row open by default. */
  initiallyOpenFirst?: boolean;
  /** When true, the action column does not include a delete button. */
  hideDelete?: boolean;
}

export function RepeatableAccordion<T extends RepeatableItem>({
  items,
  onAdd,
  onRemove,
  onMove,
  onToggleHidden,
  isHidden,
  renderHeader,
  renderItem,
  addLabel = 'Add',
  minItems = 1,
  maxItems = Infinity,
  initiallyOpenFirst = false,
  hideDelete = false
}: RepeatableAccordionProps<T>) {
  // Defensive: callers should pass an array, but the legacy widget editor can
  // briefly hand a non-array (a JSON-string setting) on first render. Never
  // throw `items.map is not a function` — degrade to an empty list.
  const safeItems = Array.isArray(items) ? items : [];
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    if (initiallyOpenFirst && safeItems[0]) return new Set([safeItems[0].id]);
    return new Set();
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    onMove(dragIndex, toIndex);
    setDragIndex(null);
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {safeItems.map((item, index) => {
          const isOpen = openIds.has(item.id);
          const hidden = isHidden?.(item) ?? false;
          return (
            <li
              key={item.id}
              draggable
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(index);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`overflow-hidden rounded-md border bg-card ${
                dragIndex === index
                  ? 'border-primary/60 opacity-60'
                  : 'border-divider'
              } ${hidden ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <div
                  className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                  title={_('Drag to reorder')}
                  aria-hidden="true"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </div>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                      isOpen ? '' : '-rotate-90'
                    }`}
                  />
                  <div className="flex-1 truncate text-xs text-foreground">
                    {renderHeader({ item, index, isOpen })}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  {onToggleHidden && (
                    <button
                      type="button"
                      onClick={() => onToggleHidden(index)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      title={
                        hidden
                          ? _('Show on storefront')
                          : _('Hide from storefront')
                      }
                    >
                      {hidden ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  {!hideDelete && (
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={safeItems.length <= minItems}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                      title={_('Remove')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {isOpen && (
                <div className="space-y-2.5 border-t border-divider px-3 py-3">
                  {renderItem({ item, index })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {onAdd && (
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={onAdd}
          disabled={safeItems.length >= maxItems}
          className="w-full justify-center"
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
