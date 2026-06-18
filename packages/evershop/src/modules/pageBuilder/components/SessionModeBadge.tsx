import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Calendar, Edit3 } from 'lucide-react';
import React from 'react';

/**
 * Subset of `Changeset.rolloutPlan` the badge actually renders. Kept structurally
 * compatible with the Editor's full `ChangesetInfo['rolloutPlan']` so callers
 * can pass the GraphQL value through directly.
 */
export interface SessionModeBadgeRolloutPlan {
  rolloutPlanId: number;
  name: string;
  startTime?: { text: string | null } | null;
  endTime?: { text: string | null } | null;
}

interface SessionModeBadgeProps {
  rolloutPlan: SessionModeBadgeRolloutPlan | null | undefined;
  /** Reopens the SessionPicker (switch session). */
  onClick: () => void;
  /**
   * Click handler for the inline pencil button. Only rendered when supplied
   * AND the badge is in rollout-edit mode — the pencil opens the schedule
   * editor (RolloutDialog in `editingPlan` mode).
   */
  onEditSchedule?: () => void;
}

/**
 * Topbar session badge (spec § 7.6).
 *
 *   - Editing draft: edit icon + "New changeset", muted styling.
 *   - Editing rollout: calendar icon + "Rollout: <name>" + a status pill
 *     (Scheduled / Live), violet styling per demo (publish-flow.jsx:58-76),
 *     plus an inline pencil button to open the schedule editor without
 *     leaving the badge.
 */
export function SessionModeBadge({
  rolloutPlan,
  onClick,
  onEditSchedule
}: SessionModeBadgeProps): React.ReactElement {
  if (!rolloutPlan) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={_('Switch session')}
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted/40 text-muted-foreground border border-divider hover:text-foreground transition-colors"
      >
        <Edit3 className="h-3 w-3" />
        {_('New changeset')}
      </button>
    );
  }
  const startMs = rolloutPlan.startTime?.text
    ? new Date(rolloutPlan.startTime.text).getTime()
    : null;
  const status: 'scheduled' | 'live' =
    startMs != null && startMs > Date.now() ? 'scheduled' : 'live';
  const pillStyles =
    status === 'scheduled'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
  // Wrapper div hosts two distinct click targets (the name area reopens the
  // picker; the pencil opens the schedule editor) without nesting <button>s,
  // which would be invalid HTML.
  return (
    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-300 hover:bg-violet-100 transition-colors dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/50">
      <button
        type="button"
        onClick={onClick}
        title={_('Switch session')}
        className="inline-flex items-center gap-1.5 -ml-0.5 outline-none focus-visible:ring-1 focus-visible:ring-violet-400 rounded-full"
      >
        <Calendar className="h-3 w-3" />
        {_('Rollout: ${name}', { name: rolloutPlan.name })}
        <span
          className={`ml-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${pillStyles}`}
        >
          {status === 'scheduled' ? _('Scheduled') : _('Live')}
        </span>
      </button>
      {onEditSchedule && (
        <button
          type="button"
          onClick={onEditSchedule}
          title={_('Edit rollout schedule')}
          aria-label={_('Edit rollout schedule')}
          className="inline-flex items-center justify-center h-4 w-4 rounded text-violet-600 hover:text-violet-900 hover:bg-violet-200/60 transition-colors dark:text-violet-400 dark:hover:text-violet-200 dark:hover:bg-violet-900/40"
        >
          <Edit3 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
