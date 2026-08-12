import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Calendar, ChevronRight, History, Plus, X } from 'lucide-react';
import React, { useEffect } from 'react';

interface RolloutPlanSummary {
  rolloutPlanId: number;
  uuid: string;
  name: string;
  /** ISO 8601 string parseable by `new Date()`. Null is filtered upstream. */
  startTime: string;
  /** ISO 8601 string or null for indefinite. */
  endTime: string | null;
}

interface SessionPickerProps {
  /** Op count for the user's existing draft. 0 means "no draft to resume". */
  draftOpCount: number;
  /** ISO timestamp of the draft's last update; rendered as a hint. */
  draftLastUpdated: string | null;
  /**
   * Upcoming + currently-live rollout plans the user could resume editing
   * (sorted by start_time ascending). Past plans are filtered out by the
   * caller. Empty array hides the "Continue a saved rollout plan" section.
   */
  rolloutPlans: ReadonlyArray<RolloutPlanSummary>;
  /**
   * Editor URL for the current route (e.g. `/admin/page-builder/edit/homepage`).
   * Used to build per-rollout edit links: clicking a rollout navigates to
   * `<editPath>?session=<rollout-uuid>` so the page handler loads that
   * rollout's changeset instead of the user's draft.
   */
  editPath: string;
  /**
   * Allow the user to dismiss the picker without choosing anything (e.g.
   * after they reopened it from the topbar badge). Suppresses the close X
   * when the dialog is the entry-point and there's no other action they
   * could take besides one of the cards.
   */
  allowDismiss?: boolean;
  onContinueDraft: () => void;
  onStartFresh: () => void;
  /** Reopen-from-badge flow: optional close handler for the X button. */
  onDismiss?: () => void;
}

/**
 * Spec § 7.8 — entry session picker. Shown on editor mount when the user
 * has *something* to choose between (existing draft ops, scheduled rollout
 * plans, or both); also reopened on demand from the topbar SessionModeBadge
 * so the user can switch sessions mid-edit.
 *
 * Three card types:
 *   1. **Continue your draft** — only shown when `draftOpCount > 0`. Resumes
 *      the in-progress changeset where the user left off.
 *   2. **Start new changeset** — discards the current draft (if any) and
 *      creates a fresh one. The primary action when there's no draft.
 *   3. **Saved rollout plan** — navigates to `<editPath>?session=<uuid>`.
 *      The page handler resolves the rollout, pins the editor to its
 *      changeset, and the topbar badge flips to the rollout name.
 */
export function SessionPicker({
  draftOpCount,
  draftLastUpdated,
  rolloutPlans,
  editPath,
  allowDismiss,
  onContinueDraft,
  onStartFresh,
  onDismiss
}: SessionPickerProps): React.ReactElement {
  // Esc / Enter default: continue the draft if there is one, else dismiss
  // by starting fresh. The user can always click an explicit option.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (draftOpCount > 0) onContinueDraft();
        // No draft + Esc → leave dialog mounted; user must click something.
      }
      if (e.key === 'Enter') {
        if (draftOpCount > 0) onContinueDraft();
        else onStartFresh();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draftOpCount, onContinueDraft, onStartFresh]);

  const updatedHint = draftLastUpdated
    ? new Date(draftLastUpdated).toLocaleString()
    : null;

  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-picker-title"
    >
      <div className="bg-card text-foreground border border-divider rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col">
        <header className="flex items-center justify-between px-5 h-[52px] border-b border-divider shrink-0">
          <h2 id="session-picker-title" className="font-semibold text-base">
            {_('Start a page-builder session')}
          </h2>
          {(allowDismiss || draftOpCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // When opened on entry: closing means "continue draft" so the
                // user keeps editing whatever they had. When reopened from the
                // topbar badge mid-session: just dismiss.
                if (allowDismiss && onDismiss) {
                  onDismiss();
                } else {
                  onContinueDraft();
                }
              }}
              aria-label={
                allowDismiss ? _('Close') : _('Close — continue draft')
              }
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </header>

        <div className="p-4 overflow-y-auto space-y-3">
          {draftOpCount > 0 && (
            <SessionCard
              icon={
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <History className="h-4 w-4" />
                </span>
              }
              title={_('Continue your draft')}
              description={
                <>
                  {draftOpCount === 1
                    ? _('Pick up where you left off — 1 pending change')
                    : _(
                        'Pick up where you left off — ${count} pending changes',
                        { count: String(draftOpCount) }
                      )}
                  {updatedHint ? (
                    <>
                      {_(', last updated')} <strong>{updatedHint}</strong>
                    </>
                  ) : null}
                  .
                </>
              }
              onClick={onContinueDraft}
            />
          )}

          <SessionCard
            icon={
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </span>
            }
            title={_('Start new changeset')}
            description={_(
              'Edit against the live storefront. Publish immediately or save as a rollout plan.'
            )}
            onClick={onStartFresh}
          />

          {rolloutPlans.length > 0 && (
            <>
              <div className="pt-3 px-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {_('Continue a saved rollout plan')}
              </div>
              {rolloutPlans.map((plan) => {
                const sep = editPath.includes('?') ? '&' : '?';
                const href = `${editPath}${sep}session=${encodeURIComponent(
                  plan.uuid
                )}`;
                return (
                  <RolloutPlanCard
                    key={plan.rolloutPlanId}
                    plan={plan}
                    href={href}
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCard({
  icon,
  title,
  description,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3 rounded-md border border-divider hover:border-primary/40 hover:bg-primary/5 transition-colors group"
    >
      {icon}
      <span className="flex-1 min-w-0">
        <span className="block font-medium text-sm text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">
          {description}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
    </button>
  );
}

function RolloutPlanCard({
  plan,
  href
}: {
  plan: RolloutPlanSummary;
  href: string;
}): React.ReactElement {
  const status = computeStatus(plan);
  const dateRange = formatDateRange(plan);
  return (
    <a
      href={href}
      className="w-full text-left flex items-center gap-3 p-3 rounded-md border border-divider hover:border-primary/40 hover:bg-primary/5 transition-colors group"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
        <Calendar className="h-4 w-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="block font-medium text-sm text-foreground truncate">
            {plan.name}
          </span>
          <StatusPill status={status} />
        </span>
        <span className="block text-xs text-muted-foreground mt-0.5">
          {dateRange}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
    </a>
  );
}

type RolloutStatus = 'scheduled' | 'live' | 'draft';

function computeStatus(plan: RolloutPlanSummary): RolloutStatus {
  // The schema requires `start_time NOT NULL`, so a "draft" rollout plan in
  // the demo's sense doesn't exist in our data model today. Reserved as a
  // future status when rollout-plan drafts land.
  const now = Date.now();
  const start = new Date(plan.startTime).getTime();
  if (start > now) return 'scheduled';
  return 'live';
}

function StatusPill({ status }: { status: RolloutStatus }): React.ReactElement {
  const styles: Record<RolloutStatus, string> = {
    scheduled:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    live: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    draft: 'bg-muted text-muted-foreground'
  };
  const labels: Record<RolloutStatus, string> = {
    scheduled: _('Scheduled'),
    live: _('Live'),
    draft: _('Draft')
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDateRange(plan: RolloutPlanSummary): string {
  const start = new Date(plan.startTime);
  const startLabel = formatDate(start);
  if (!plan.endTime) {
    return `${startLabel} → ${_('indefinite')}`;
  }
  const end = new Date(plan.endTime);
  return `${startLabel} → ${formatDate(end)}`;
}

function formatDate(d: Date): string {
  // "Jun 15, 2026, 08:00 AM"
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
