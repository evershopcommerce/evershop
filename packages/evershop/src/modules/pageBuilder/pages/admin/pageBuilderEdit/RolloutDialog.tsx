import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useMemo, useState } from 'react';

export interface RolloutPlanInput {
  name: string;
  startTime: string; // ISO
  endTime: string | null;
}

/**
 * Subset of `rollout_plan` columns needed for the client-side overlap check.
 * Caller should supply the same set the server's overlap query considers —
 * "active or upcoming" plans, i.e. `end_time IS NULL OR end_time > NOW()`.
 * Past plans should be filtered out by the caller so the overlap math stays
 * cheap.
 */
export interface ExistingRolloutPlan {
  rolloutPlanId: number;
  name: string;
  startTime: string;
  endTime: string | null;
}

interface RolloutDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (plan: RolloutPlanInput) => void;
  isBusy: boolean;
  /**
   * Active-or-upcoming rollout plans the new plan would have to coexist with.
   * Used for the live overlap check that mirrors spec § 5.9.1 — same
   * algorithm as the server's `createRolloutPlan` endpoint, so the user
   * sees the same verdict before submission.
   */
  existingPlans?: ReadonlyArray<ExistingRolloutPlan>;
  /**
   * When set, the dialog opens in **edit mode**: title/submit copy change,
   * fields pre-fill from this plan's values, and the overlap check skips
   * the plan being edited (so re-saving the same window doesn't conflict
   * with itself).
   */
  editingPlan?: {
    rolloutPlanId: number;
    name: string;
    startTime: string;
    endTime: string | null;
  } | null;
}

interface FieldErrors {
  name?: string;
  startTime?: string;
  endTime?: string;
  overlap?: string;
  /**
   * Names of existing plans whose active windows overlap the proposed
   * window. Populated alongside `overlap` so the UI can render the
   * conflicting plan(s) directly in the status badge / detail area
   * without re-parsing the message string.
   */
  overlapPlans?: ReadonlyArray<string>;
}

function fmtRange(startAt: string, endAt: string): string {
  if (!startAt) return _('Draft — not scheduled');
  const fmt = (v: string) =>
    new Date(v).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  return `${fmt(startAt)} → ${endAt ? fmt(endAt) : _('open')}`;
}

/**
 * Pure validator. Returns the field-error map for the current field values.
 * Called on every render so the form stays in sync; cheap because the
 * existingPlans list is already small (active/upcoming only) and the check
 * is O(n).
 */
function validate(
  name: string,
  startAt: string,
  endAt: string,
  existingPlans: ReadonlyArray<ExistingRolloutPlan>
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = _('Name is required.');
  }

  // Start time is required to actually schedule. Empty start = draft mode,
  // which is intentionally allowed by the dialog copy.
  let startMs: number | null = null;
  if (startAt) {
    const ms = new Date(startAt).getTime();
    if (Number.isNaN(ms)) {
      errors.startTime = _('Start time is invalid.');
    } else {
      startMs = ms;
    }
  } else {
    errors.startTime = _('Pick a start time to schedule this rollout.');
  }

  let endMs: number | null = null;
  if (endAt) {
    const ms = new Date(endAt).getTime();
    if (Number.isNaN(ms)) {
      errors.endTime = _('End time is invalid.');
    } else if (startMs != null && ms <= startMs) {
      errors.endTime = _('End time must be after start time.');
    } else {
      endMs = ms;
    }
  }

  // Overlap with existing active-or-upcoming plans (spec § 5.9.1). Skipped
  // when there's a more fundamental field error — no point checking the
  // overlap of an invalid range.
  if (startMs != null && !errors.endTime) {
    const proposedEnd = endMs ?? Number.POSITIVE_INFINITY;
    const conflicts: string[] = [];
    const now = Date.now();
    for (const p of existingPlans) {
      const eStartMs = new Date(p.startTime).getTime();
      if (Number.isNaN(eStartMs)) continue;
      const eEndMs = p.endTime
        ? new Date(p.endTime).getTime()
        : Number.POSITIVE_INFINITY;
      // Skip past plans defensively (caller should filter, but be safe).
      if (eEndMs <= now) continue;
      // [s1, e1) ∩ [s2, e2) non-empty iff s1 < e2 AND s2 < e1.
      if (eStartMs < proposedEnd && startMs < eEndMs) {
        conflicts.push(p.name);
      }
    }
    if (conflicts.length > 0) {
      errors.overlap =
        conflicts.length === 1
          ? _('Overlaps with existing rollout: ${plans}.', {
              plans: conflicts.join(', ')
            })
          : _('Overlaps with existing rollouts: ${plans}.', {
              plans: conflicts.join(', ')
            });
      errors.overlapPlans = conflicts;
    }
  }

  return errors;
}

/**
 * Convert an ISO timestamp to the value `<input type="datetime-local">`
 * expects (`yyyy-MM-ddTHH:mm` in the user's local timezone). Pre-fill needs
 * this because the GraphQL DateTime resolver returns ISO with offset; the
 * native input can't read that directly.
 */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function RolloutDialog({
  open,
  onClose,
  onSubmit,
  isBusy,
  existingPlans = [],
  editingPlan = null
}: RolloutDialogProps): React.ReactElement {
  const isEditMode = editingPlan != null;
  const [name, setName] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  // Per-field "user has interacted" flags so we don't yell at the user about
  // an empty form they just opened. Errors render once a field is touched
  // OR after the user attempts to submit.
  const [touched, setTouched] = useState<{
    name: boolean;
    startTime: boolean;
    endTime: boolean;
  }>({ name: false, startTime: false, endTime: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Reset / pre-fill on every open. In create mode the form is blank; in
  // edit mode the fields seed from the plan being edited so the user is
  // tweaking real values, not retyping from scratch.
  useEffect(() => {
    if (!open) return;
    if (editingPlan) {
      setName(editingPlan.name);
      setStartAt(isoToLocalInput(editingPlan.startTime));
      setEndAt(editingPlan.endTime ? isoToLocalInput(editingPlan.endTime) : '');
    } else {
      setName('');
      setStartAt('');
      setEndAt('');
    }
    setTouched({ name: false, startTime: false, endTime: false });
    setSubmitAttempted(false);
  }, [open, editingPlan]);

  // Edit mode excludes self from the overlap check — re-saving the same
  // window shouldn't conflict with itself.
  const overlapPlans = useMemo(
    () =>
      editingPlan
        ? existingPlans.filter(
            (p) => p.rolloutPlanId !== editingPlan.rolloutPlanId
          )
        : existingPlans,
    [existingPlans, editingPlan]
  );

  const errors = useMemo(
    () => validate(name, startAt, endAt, overlapPlans),
    [name, startAt, endAt, overlapPlans]
  );
  const isValid = Object.keys(errors).length === 0;

  // String-valued error keys. `overlapPlans` is a sibling array that
  // carries the same overlap info in structured form for the badge UI;
  // showError stays text-only so the existing JSX `{showError(...)}`
  // call sites keep their string contract.
  type ErrorMessageKey = 'name' | 'startTime' | 'endTime' | 'overlap';
  const showError = (key: ErrorMessageKey): string | undefined => {
    // Overlap is a cross-field/form-level error. The user has clearly
    // entered enough data to evaluate a conflict; gating it on `touched`
    // hides the most useful message for the wrong reason. Surface as soon
    // as it's detected.
    if (key === 'overlap') return errors.overlap;
    if (submitAttempted) return errors[key];
    if (key === 'name' && touched.name) return errors.name;
    if (key === 'startTime' && touched.startTime) return errors.startTime;
    if (key === 'endTime' && touched.endTime) return errors.endTime;
    return undefined;
  };

  const willBeDraft = !startAt;

  // Badge label reflects the actual error so the merchant can act on it
  // immediately. "Has conflicts" is reserved for real overlap with other
  // plans; structural errors (missing name, end ≤ start, etc.) get their
  // own labels instead of being miscategorised as conflicts.
  const statusBadgeLabel: string = (() => {
    if (errors.overlap && (errors.overlapPlans?.length ?? 0) > 0) {
      const planNames = errors.overlapPlans!;
      if (planNames.length === 1)
        return _('Conflicts with ${plan}', { plan: planNames[0] });
      if (planNames.length === 2)
        return _('Conflicts with ${plan1}, ${plan2}', {
          plan1: planNames[0],
          plan2: planNames[1]
        });
      return _('Conflicts with ${plan} +${count}', {
        plan: planNames[0],
        count: String(planNames.length - 1)
      });
    }
    if (errors.endTime) return _('Invalid window');
    if (errors.startTime) return _('Invalid start');
    if (errors.name) return _('Missing name');
    // Defensive — shouldn't reach here when isValid is false but the
    // errors map is somehow empty. Keep the original generic label.
    return _('Has conflicts');
  })();

  const handleSave = () => {
    setSubmitAttempted(true);
    if (!isValid) return; // Defensive — button should be disabled in this case.
    const startMs = new Date(startAt).getTime();
    const endIso = endAt
      ? new Date(new Date(endAt).getTime()).toISOString()
      : null;
    onSubmit({
      name: name.trim(),
      startTime: new Date(startMs).toISOString(),
      endTime: endIso
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? _('Edit rollout schedule')
              : _('Save as rollout plan')}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
          {isEditMode
            ? _(
                'Update the name and active window for this rollout plan. Content edits are managed separately in the editor.'
              )
            : _(
                'A rollout plan saves your current edits as a snapshot and applies them automatically during a scheduled window.'
              )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80 tracking-wide">
            {_('Name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder={_('e.g. Summer Sale 2026')}
            aria-invalid={!!showError('name')}
            className={`w-full bg-card border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 ${
              showError('name')
                ? 'border-destructive focus:ring-destructive'
                : 'border-divider focus:ring-primary'
            }`}
          />
          {showError('name') && (
            <p className="text-xs text-destructive" role="alert">
              {showError('name')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide">
              {_('Start')}
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, startTime: true }))}
              aria-invalid={!!showError('startTime')}
              className={`w-full bg-card border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                showError('startTime')
                  ? 'border-destructive focus:ring-destructive'
                  : 'border-divider focus:ring-primary'
              }`}
            />
            {showError('startTime') && (
              <p className="text-xs text-destructive" role="alert">
                {showError('startTime')}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide">
              {_('End')}{' '}
              <span className="font-normal text-muted-foreground">
                {_('(optional)')}
              </span>
            </label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, endTime: true }))}
              disabled={!startAt}
              aria-invalid={!!showError('endTime')}
              className={`w-full bg-card border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 disabled:opacity-50 ${
                showError('endTime')
                  ? 'border-destructive focus:ring-destructive'
                  : 'border-divider focus:ring-primary'
              }`}
            />
            {showError('endTime') && (
              <p className="text-xs text-destructive" role="alert">
                {showError('endTime')}
              </p>
            )}
          </div>
        </div>

        {showError('overlap') && (
          <div
            className="text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded-md px-3 py-2"
            role="alert"
          >
            {showError('overlap')}
          </div>
        )}

        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            {willBeDraft ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted/50 text-muted-foreground">
                {_('Pending start time')}
              </span>
            ) : (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  isValid
                    ? 'bg-primary/15 text-primary'
                    : 'bg-destructive/15 text-destructive'
                }`}
              >
                {isValid ? _('Scheduled') : statusBadgeLabel}
              </span>
            )}
            <span>
              {willBeDraft
                ? _('Set a start time to schedule.')
                : _('Will roll out automatically: ${range}', {
                    range: fmtRange(startAt, endAt)
                  })}
            </span>
          </div>
          {/* When the proposed window overlaps existing plans, render each
              conflicting plan as a chip right under the badge so the merchant
              can see *which* plan(s) collide without scanning the form. The
              same names also appear in the inline overlap error above —
              kept in both places because each is visible in different
              scenarios (the inline message can scroll out of view in long
              forms; the chips stay anchored to the status row). */}
          {!isValid && !willBeDraft && (errors.overlapPlans?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                {_('Conflicts with:')}
              </span>
              {errors.overlapPlans!.map((planName) => (
                <span
                  key={planName}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-[11px] font-medium"
                  title={_('Existing rollout plan: ${plan}', { plan: planName })}
                >
                  {planName}
                </span>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <ButtonGroup className="gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isBusy}>
              {_('Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isBusy || !isValid}>
              {isBusy
                ? _('Saving…')
                : isEditMode
                ? _('Save changes')
                : _('Create rollout plan')}
            </Button>
          </ButtonGroup>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
