import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import {
  AlertTriangle,
  ArrowRight,
  Layers,
  Minus,
  Pencil,
  Plus,
  Rocket
} from 'lucide-react';
import React, { useMemo } from 'react';

interface ChangesetOperation {
  entityUrn: string;
  oldPayload: Record<string, unknown> | null;
  newPayload: Record<string, unknown> | null;
  route?: string | null;
}

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isBusy: boolean;
  operations: ChangesetOperation[];
}

interface OpSummary {
  added: number;
  updated: number;
  removed: number;
  total: number;
  routes: Array<{ id: string; count: number }>;
}

function summarize(ops: ChangesetOperation[]): OpSummary {
  let added = 0;
  let updated = 0;
  let removed = 0;
  const routeCounts = new Map<string, number>();
  for (const op of ops) {
    const isWidget = op.entityUrn?.includes(':widget_instance:');
    const isPlacement = op.entityUrn?.includes(':widget_placement:');
    if (!isWidget && !isPlacement) continue;
    const isInsert = op.oldPayload == null && op.newPayload != null;
    const isDelete = op.oldPayload != null && op.newPayload == null;
    const isUpdate = op.oldPayload != null && op.newPayload != null;
    // Count widget_instance ops only — placement ops are derived (every
    // INSERT/DELETE widget pairs with a placement op; updates to widget
    // settings vs placement sort_order are merged into a single "updated"
    // figure). Showing both was noisy without adding signal.
    if (isWidget) {
      if (isInsert) added += 1;
      else if (isUpdate) updated += 1;
      else if (isDelete) removed += 1;
    } else if (isPlacement) {
      // Placement-only ops (e.g. reorder, cross-route share) count as updates.
      if (isUpdate) updated += 1;
      else if (isInsert) added += 0; // already counted via the widget INSERT
      else if (isDelete) removed += 0; // already counted via the widget DELETE
    }
    const r = op.route;
    if (typeof r === 'string' && r.length > 0) {
      routeCounts.set(r, (routeCounts.get(r) ?? 0) + 1);
    }
  }
  const routes = Array.from(routeCounts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
  return { added, updated, removed, total: ops.length, routes };
}

function humanizeRoute(id: string): string {
  if (id === 'all') return _('every page');
  // Camel-case route ids → spaced words: `categoryView` → `Category view`.
  const spaced = id.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: 'add' | 'update' | 'remove';
}

const TONE_CLASSES: Record<StatCardProps['tone'], string> = {
  add: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
  update:
    'bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60',
  remove:
    'bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60'
};

function StatCard({ icon, label, count, tone }: StatCardProps) {
  const dim = count === 0;
  return (
    <div
      className={`flex flex-col gap-1 rounded-md border border-divider/60 bg-card px-3 py-2.5 transition-opacity ${
        dim ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md ring-1 ${TONE_CLASSES[tone]}`}
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <span className="ml-8 text-lg font-semibold leading-tight tabular-nums">
        {count}
      </span>
    </div>
  );
}

export function PublishDialog({
  open,
  onClose,
  onConfirm,
  isBusy,
  operations
}: PublishDialogProps): React.ReactElement {
  const summary = useMemo(() => summarize(operations || []), [operations]);
  const total = summary.total;
  const hasOps = total > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (!o && !isBusy ? onClose() : null)}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15"
              aria-hidden="true"
            >
              <Rocket className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-sm font-medium">
                {hasOps
                  ? _('Publish to the live storefront')
                  : _('Nothing to publish')}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {hasOps ? (
                  <>
                    {total === 1
                      ? _('1 change will go live immediately.')
                      : _('${total} changes will go live immediately.', {
                          total: String(total)
                        })}{' '}
                    {_(
                      'Visitors will see the new layout on their next page load.'
                    )}
                  </>
                ) : (
                  <>{_('This changeset has no operations yet.')}</>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {hasOps && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                icon={<Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
                label={_('Added')}
                count={summary.added}
                tone="add"
              />
              <StatCard
                icon={<Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />}
                label={_('Updated')}
                count={summary.updated}
                tone="update"
              />
              <StatCard
                icon={<Minus className="h-3.5 w-3.5" strokeWidth={2.5} />}
                label={_('Removed')}
                count={summary.removed}
                tone="remove"
              />
            </div>

            {summary.routes.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-divider/60 bg-muted/30 px-3 py-2.5">
                <Layers
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-medium text-foreground">
                    {summary.routes.length === 1
                      ? _('Affects 1 page')
                      : _('Affects ${count} pages', {
                          count: String(summary.routes.length)
                        })}
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    {summary.routes
                      .slice(0, 4)
                      .map((r) => humanizeRoute(r.id))
                      .join(', ')}
                    {summary.routes.length > 4 && (
                      <span>
                        {' '}
                        {_('+${count} more', {
                          count: String(summary.routes.length - 4)
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-md border border-amber-200/70 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold">{_('Heads up — ')}</strong>
                {_(
                  'publishing is immediate and can’t be undone from this screen. To stage instead, cancel and choose “Schedule a rollout”.'
                )}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isBusy}>
            {_('Cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isBusy || !hasOps}
            className="gap-1.5"
          >
            {isBusy ? (
              <>{_('Publishing…')}</>
            ) : (
              <>
                {_('Publish now')}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
