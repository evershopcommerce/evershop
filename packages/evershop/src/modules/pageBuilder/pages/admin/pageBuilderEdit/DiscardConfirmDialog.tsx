import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@components/common/ui/AlertDialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';

export type DiscardMode = 'all' | 'route';

export interface DiscardConfirmDialogProps {
  open: boolean;
  /**
   * The route the user is currently viewing — drives the label of the
   * "this page only" option and the route filter sent on confirm.
   */
  currentRouteId: string;
  currentRouteName?: string;
  /**
   * Op count for the current route, when known. Renders as a small hint.
   * Pass `undefined` to omit; pass `0` to hide the "this page only" option
   * entirely (nothing to discard on this page).
   */
  currentRouteOpCount: number | undefined;
  /**
   * Per-route breakdown for the "all" option's hint text. Sorted by count
   * descending by the caller. Pass `[]` if unknown.
   */
  routeBreakdown: ReadonlyArray<{ route: string; count: number }>;
  totalOpCount: number;
  busy?: boolean;
  /**
   * When true, the dialog reframes its copy for rollout-edit mode: "revert"
   * instead of "discard", and the option subtitles describe the rollback to
   * the rollout's saved snapshot rather than draft destruction. Server
   * semantics (rolllout vs draft) are inferred there; this prop only
   * controls UI text.
   */
  rolloutMode?: boolean;
  onConfirm: (mode: DiscardMode) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Two-mode discard dialog (spec § 7.6 / § 7.8). The default is to discard
 * the whole draft (legacy behavior). Users editing across multiple routes
 * can opt into a route-scoped discard that leaves their other-route work
 * intact.
 */
export function DiscardConfirmDialog({
  open,
  currentRouteId,
  currentRouteName,
  currentRouteOpCount,
  routeBreakdown,
  totalOpCount,
  busy = false,
  rolloutMode = false,
  onConfirm,
  onCancel
}: DiscardConfirmDialogProps): React.ReactElement {
  const [mode, setMode] = useState<DiscardMode>('all');

  // Re-seed default to 'all' every time the dialog re-opens, so the safer
  // default doesn't carry over a previous session's choice.
  useEffect(() => {
    if (open) setMode('all');
  }, [open]);

  const hasRouteOps =
    typeof currentRouteOpCount === 'number' && currentRouteOpCount > 0;
  const breakdownLabel =
    routeBreakdown.length > 0
      ? routeBreakdown
          .map((r) =>
            _('${count} on ${route}', {
              count: String(r.count),
              route: r.route
            })
          )
          .join(', ')
      : null;
  const routeLabel = currentRouteName || currentRouteId;

  return (
    <AlertDialog open={open} onOpenChange={(o) => (!o ? onCancel() : null)}>
      {/* `text-sm` on the container + `text-sm` on the title match the
          page-builder Dialog (RolloutDialog) typography — AlertDialog
          primitive has no base font size and would otherwise look heavier
          (16/18 px) than the rest of the page-builder modals. */}
      <AlertDialogContent
        className="z-[1300] text-sm"
        overlayClassName="z-[1300]"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-medium">
            {rolloutMode
              ? _('Revert to saved state?')
              : _('Discard pending changes?')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {rolloutMode
              ? _(
                  'Roll back the changes you have made since this rollout was last saved. The live storefront is unaffected — it already reflects the saved state.'
                )
              : _(
                  'Choose how much of your unpublished work to discard. The published storefront is not affected.'
                )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 text-sm">
          <label
            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
              mode === 'all'
                ? 'border-primary bg-primary/5'
                : 'border-divider hover:bg-muted/40'
            }`}
          >
            <input
              type="radio"
              name="discard-mode"
              value="all"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              disabled={busy}
              className="mt-1 accent-primary"
            />
            <span className="flex-1">
              <span className="block font-medium">
                {rolloutMode
                  ? _('Revert all pages to saved state')
                  : _('Discard everything in this draft')}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {rolloutMode
                  ? totalOpCount > 0
                    ? `${
                        totalOpCount === 1
                          ? _('1 pending op')
                          : _('${count} pending ops', {
                              count: String(totalOpCount)
                            })
                      }${breakdownLabel ? ` — ${breakdownLabel}` : ''}. ${_(
                        'Every page rolls back to what the rollout had saved.'
                      )}`
                    : _('Every page rolls back to the rollout’s saved state.')
                  : totalOpCount > 0
                  ? `${
                      totalOpCount === 1
                        ? _('1 op total')
                        : _('${count} ops total', {
                            count: String(totalOpCount)
                          })
                    }${breakdownLabel ? ` — ${breakdownLabel}` : ''}. ${_(
                      'The draft itself is deleted.'
                    )}`
                  : _('The draft is deleted.')}
              </span>
            </span>
          </label>

          {hasRouteOps && (
            <label
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                mode === 'route'
                  ? 'border-primary bg-primary/5'
                  : 'border-divider hover:bg-muted/40'
              }`}
            >
              <input
                type="radio"
                name="discard-mode"
                value="route"
                checked={mode === 'route'}
                onChange={() => setMode('route')}
                disabled={busy}
                className="mt-1 accent-primary"
              />
              <span className="flex-1">
                <span className="block font-medium">
                  {rolloutMode
                    ? _('Revert this page only')
                    : _('Discard changes on this page only')}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {currentRouteOpCount === 1
                    ? _('1 pending op on')
                    : _('${count} pending ops on', {
                        count: String(currentRouteOpCount)
                      })}{' '}
                  <strong>{routeLabel}</strong>.{' '}
                  {rolloutMode
                    ? _('Other pages keep their pending changes.')
                    : _('Your edits on other pages stay in the draft.')}
                </span>
              </span>
            </label>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onCancel}>
            {_('Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            variant="destructive"
            onClick={() => {
              void onConfirm(mode);
            }}
          >
            {busy
              ? rolloutMode
                ? _('Reverting…')
                : _('Discarding…')
              : rolloutMode
              ? mode === 'all'
                ? _('Revert everything')
                : _('Revert this page')
              : mode === 'all'
              ? _('Discard everything')
              : _('Discard this page')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
