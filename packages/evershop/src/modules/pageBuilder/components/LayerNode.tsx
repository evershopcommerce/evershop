import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { getWidgetIcon } from './widgetIcons.js';

export interface LayerWidget {
  uuid: string;
  name: string | null;
  type: string;
  rawSettings: Record<string, unknown> | null;
  columns?: Array<{
    index: number;
    widgets: LayerWidget[];
  }>;
}

/**
 * Minimal shape from the widget-type registry — the Layers panel renders
 * the canonical widget name + description (not the instance's per-row
 * name/code, which were terse and not human-friendly).
 */
export interface LayerNodeWidgetType {
  code: string;
  name: string;
  description: string;
  /** Optional lucide icon name; resolved via `getWidgetIcon`. */
  icon?: string | null;
}

interface LayerNodeProps {
  widget: LayerWidget;
  selectedUid: string | null;
  onSelect: (
    uid: string,
    type: string,
    settings: Record<string, unknown>
  ) => void;
  depth?: number;
  /**
   * Lookup from widget code → registry entry. Parent builds the map once
   * from `widgetTypes` and passes it through; LayerNode threads it into
   * its recursive children so the lookup stays O(1) at every depth.
   */
  widgetTypesByCode: ReadonlyMap<string, LayerNodeWidgetType>;
}

export function LayerNode({
  widget,
  selectedUid,
  onSelect,
  depth = 0,
  widgetTypesByCode
}: LayerNodeProps): React.ReactElement {
  const isSelected = selectedUid === widget.uuid;
  const cols = widget.columns ?? [];
  const hasChildren = cols.some((c) => (c.widgets ?? []).length > 0);
  const def = widgetTypesByCode.get(widget.type);
  // Fall back to the raw code when the registry doesn't know this type
  // (e.g. an instance of a deleted/renamed widget type). Description omitted
  // in that case to keep the row from displaying a misleading blank line.
  const displayName = def?.name ? _(def.name) : widget.type;
  const description = def?.description ? _(def.description) : '';
  const WidgetIcon = getWidgetIcon(def?.icon);
  return (
    <li>
      <button
        type="button"
        onClick={() =>
          onSelect(
            widget.uuid,
            widget.type,
            (widget.rawSettings ?? {}) as Record<string, unknown>
          )
        }
        style={{ paddingLeft: 8 + depth * 12 }}
        className={`w-full text-left flex items-center gap-2 py-1.5 pr-2 rounded-md text-sm transition-colors ${
          isSelected
            ? 'bg-primary/10 text-primary font-medium'
            : 'hover:bg-muted/40 text-foreground'
        }`}
      >
        <WidgetIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px]">{displayName}</span>
          {description && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {description}
            </span>
          )}
        </span>
      </button>
      {hasChildren && (
        <ul className="space-y-1">
          {cols.map((col) => (
            <React.Fragment key={col.index}>
              {(col.widgets ?? []).length > 0 && (
                <li>
                  <div
                    className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pt-1"
                    style={{ paddingLeft: 16 + depth * 12 }}
                  >
                    {_('Column ${index}', { index: String(col.index + 1) })}
                  </div>
                  <ul className="space-y-1">
                    {col.widgets.map((kid) => (
                      <LayerNode
                        key={kid.uuid}
                        widget={kid}
                        selectedUid={selectedUid}
                        onSelect={onSelect}
                        depth={depth + 1}
                        widgetTypesByCode={widgetTypesByCode}
                      />
                    ))}
                  </ul>
                </li>
              )}
            </React.Fragment>
          ))}
        </ul>
      )}
    </li>
  );
}
