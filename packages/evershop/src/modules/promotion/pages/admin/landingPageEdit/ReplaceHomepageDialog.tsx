import { Alert, AlertDescription } from '@components/common/ui/Alert.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@components/common/ui/Dialog.js';
import { Spinner } from '@components/common/ui/Spinner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface PlanSummary {
  uuid: string;
  name: string;
  status: string;
  editUrl: string;
}

interface Preflight {
  landingPage: {
    name: string;
    isLive: boolean;
    unpublishedOperationCount: number;
    sharedRouteLevelCount: number;
    hiddenPlacementCount: number;
    selfLinkCount: number;
    renderablePlacementCount: number;
    rolloutPlans: PlanSummary[];
  };
  homepage: { placementCount: number; allRouteContentCount: number };
  backup: { willCreate: boolean; name: string };
  drafts: {
    operationCount: number;
    byCurrentAdmin: number;
    otherAdminCount: number;
    detachedRolloutOperationCount: number;
  };
  pastPlansToCancel: PlanSummary[];
  blockers: { rolloutPlans: PlanSummary[]; entityScopedHomepage: boolean };
  fingerprints: { homepage: string; landingPage: string };
  backupsTotal: number;
  warnings: string[];
}

interface ExecuteResult {
  backup: { uuid: string; name: string; editUrl: string };
  backupsTotal: number;
  links: Array<{ rel: string; href: string }>;
}

type State =
  | { kind: 'loading' }
  | { kind: 'blocked'; data: Preflight; notice?: string }
  | { kind: 'allowed'; data: Preflight; notice?: string }
  | { kind: 'submitting'; data: Preflight; notice?: string }
  | { kind: 'success'; result: ExecuteResult }
  | { kind: 'error'; message: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landingPageName: string;
  preflightApi: string;
  replaceApi: string;
}

const n = (v: number) => String(v);

/**
 * Amber warning callout — the same treatment as the product DuplicateBanner
 * (UI-kit Alert + amber border/background/text + the page-builder dialogs'
 * triangle icon). Used for the pre-confirm consequences and the blocked state.
 */
/** Emerald success callout — the page-builder dialogs' success palette on the UI-kit Alert. */
function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
      <CheckCircle2 className="size-4" aria-hidden="true" />
      <AlertDescription className="col-start-2 text-emerald-800 dark:text-emerald-300 [&_a]:font-medium [&_a]:text-current">
        {children}
      </AlertDescription>
    </Alert>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <Alert className="border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200">
      <AlertTriangle className="size-4" aria-hidden="true" />
      <AlertDescription className="col-start-2 text-amber-800 dark:text-amber-300 [&_a]:font-medium [&_a]:text-current">
        {children}
      </AlertDescription>
    </Alert>
  );
}

/**
 * One controlled dialog with a state machine (loading → blocked | allowed →
 * submitting → success | error). Uses the UI-kit Dialog directly: AlertDialog
 * stacks below Dialog and ConfirmDialog cannot hold loading/success states.
 * Every counted sentence is one whole `_()` string with `${count}`.
 */
export function ReplaceHomepageDialog({
  open,
  onOpenChange,
  landingPageName,
  preflightApi,
  replaceApi
}: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const runPreflight = useCallback(
    async (notice?: string) => {
      setState({ kind: 'loading' });
      const res = await axios.get(preflightApi, { validateStatus: () => true });
      if (res.status !== 200 || !res.data?.data) {
        setState({
          kind: 'error',
          message: res.data?.error?.message ?? _('Could not check the homepage.')
        });
        return;
      }
      const data: Preflight = res.data.data;
      const blocked =
        data.blockers.rolloutPlans.length > 0 || data.blockers.entityScopedHomepage;
      setState(blocked ? { kind: 'blocked', data, notice } : { kind: 'allowed', data, notice });
    },
    [preflightApi]
  );

  useEffect(() => {
    if (open) runPreflight();
  }, [open, runPreflight]);

  const confirm = async () => {
    if (state.kind !== 'allowed') return;
    const { data } = state;
    setState({ kind: 'submitting', data, notice: state.notice });
    const res = await axios.post(
      replaceApi,
      {
        confirm: true,
        homepageFingerprint: data.fingerprints.homepage,
        landingPageFingerprint: data.fingerprints.landingPage
      },
      { validateStatus: () => true }
    );
    if (res.status === 200 && res.data?.data) {
      setState({ kind: 'success', result: res.data.data });
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && (code === 'HOMEPAGE_CHANGED' || code === 'HOMEPAGE_ROLLOUT_ACTIVE')) {
      await runPreflight(_('Something changed since the preview. Please review again.'));
      return;
    }
    setState({
      kind: 'error',
      message: res.data?.error?.message ?? _('The homepage could not be replaced.')
    });
  };

  const renderPlanList = (plans: PlanSummary[]) => (
    <ul className="list-disc pl-5 space-y-1">
      {plans.map((p) => (
        <li key={p.uuid}>
          <a className="underline underline-offset-3" href={p.editUrl}>
            {p.name}
          </a>{' '}
          <span className="opacity-75">
            ({p.status === 'active' ? _('active') : _('upcoming')})
          </span>
        </li>
      ))}
    </ul>
  );

  const renderSentences = (data: Preflight) => {
    const lines: string[] = [];
    lines.push(
      _(
        'The current homepage widgets will be moved to a new disabled landing page named "${name}". You can restore it later with this same action.',
        { name: data.backup.name }
      )
    );
    if (data.drafts.byCurrentAdmin > 0) {
      lines.push(
        _('${count} unpublished homepage change(s) by you will be discarded.', {
          count: n(data.drafts.byCurrentAdmin)
        })
      );
    }
    const others = data.drafts.operationCount - data.drafts.byCurrentAdmin;
    if (others > 0) {
      lines.push(
        _('${count} unpublished homepage change(s) by ${admins} other admin(s) will be discarded.', {
          count: n(others),
          admins: n(data.drafts.otherAdminCount)
        })
      );
    }
    if (data.drafts.detachedRolloutOperationCount > 0) {
      lines.push(
        _('${count} change(s) left over from cancelled rollout plans will be discarded.', {
          count: n(data.drafts.detachedRolloutOperationCount)
        })
      );
    }
    if (data.pastPlansToCancel.length > 0) {
      lines.push(
        _('${count} ended rollout plan(s) that changed the homepage will be cancelled so they cannot be re-scheduled.', {
          count: n(data.pastPlansToCancel.length)
        })
      );
    }
    if (!data.landingPage.isLive) {
      lines.push(
        _('This landing page is not live (unpublished, scheduled, or expired). The homepage does not use its schedule; the copy goes live as soon as you confirm.')
      );
    }
    if (data.landingPage.unpublishedOperationCount > 0) {
      lines.push(
        _('This landing page has ${count} unpublished change(s) in the page builder. Only published content is copied. Publish it first if the editor canvas is what you want.', {
          count: n(data.landingPage.unpublishedOperationCount)
        })
      );
    }
    if (data.landingPage.rolloutPlans.length > 0) {
      lines.push(_('A rollout plan is changing this landing page. Only its published content is copied.'));
    }
    if (data.landingPage.sharedRouteLevelCount > 0) {
      lines.push(
        _('${count} widget(s) shown on every landing page are not part of this page and will not be copied.', {
          count: n(data.landingPage.sharedRouteLevelCount)
        })
      );
    }
    if (data.landingPage.hiddenPlacementCount > 0) {
      lines.push(
        _('${count} hidden widget(s) in this page\'s "content" area will not be copied.', {
          count: n(data.landingPage.hiddenPlacementCount)
        })
      );
    }
    if (data.landingPage.selfLinkCount > 0) {
      lines.push(
        _('${count} link(s) in this page point at the page itself. They will still point there from the homepage.', {
          count: n(data.landingPage.selfLinkCount)
        })
      );
    }
    if (data.landingPage.renderablePlacementCount === 0) {
      lines.push(
        _('This landing page has no visible widgets in the current theme. The homepage will be empty.')
      );
    }
    if (data.homepage.allRouteContentCount > 0) {
      lines.push(
        _('${count} site-wide widget(s) sit in the homepage content area and will appear mixed into the copied layout.', {
          count: n(data.homepage.allRouteContentCount)
        })
      );
    }
    return (
      <WarningBox>
        <ul className="list-disc pl-4 space-y-2">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </WarningBox>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{_('Replace homepage with this page')}</DialogTitle>
          <DialogDescription>
            {_('The homepage will show the widgets of "${name}".', { name: landingPageName })}
          </DialogDescription>
        </DialogHeader>

        {state.kind === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> {_('Checking the homepage…')}
          </div>
        )}

        {(state.kind === 'blocked' || state.kind === 'allowed' || state.kind === 'submitting') &&
          state.notice && (
            <p className="text-sm text-amber-600">{state.notice}</p>
          )}

        {state.kind === 'blocked' && (
          <WarningBox>
            <div className="space-y-2">
              {state.data.blockers.rolloutPlans.length > 0 && (
                <>
                  <p>{_('These rollout plans change the homepage. Cancel them or wait until they end, then try again.')}</p>
                  {renderPlanList(state.data.blockers.rolloutPlans)}
                </>
              )}
              {state.data.blockers.entityScopedHomepage && (
                <p>{_('The homepage has page-specific widget placements. Remove them in the page builder first.')}</p>
              )}
            </div>
          </WarningBox>
        )}

        {(state.kind === 'allowed' || state.kind === 'submitting') && renderSentences(state.data)}

        {state.kind === 'success' && (
          <SuccessBox>
            <div className="space-y-2">
              <p>
                {_('Done. "${name}" is still published at its own URL. You now have ${count} homepage backup(s).', {
                  name: landingPageName,
                  count: n(state.result.backupsTotal)
                })}
              </p>
              <ul className="list-disc pl-4 space-y-1">
                {state.result.links.map((l) => (
                  <li key={l.rel}>
                    <a className="underline underline-offset-3" href={l.href}>
                      {l.rel === 'backup' ? _('View backup') : _('Open homepage in page builder')}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </SuccessBox>
        )}

        {state.kind === 'error' && <p className="text-sm text-destructive">{state.message}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {state.kind === 'success' ? _('Close') : _('Cancel')}
          </Button>
          {state.kind !== 'success' && state.kind !== 'error' && (
            <Button
              type="button"
              variant="destructive"
              disabled={state.kind !== 'allowed'}
              isLoading={state.kind === 'submitting'}
              onClick={confirm}
            >
              {_('Replace homepage')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
