import { useAlertContext } from '@components/common/modal/Alert.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { JobScreenView } from '../../../components/JobScreenView.js';
import { refusalMessage } from '../../../components/labels.js';
import { ProblemsTable } from '../../../components/ProblemsTable.js';
import type { JobStatus } from '../../../services/job/types.js';
import { axiosHttp } from '../../../ui/axiosHttp.js';
import { browserEnvironment } from '../../../ui/browserEnvironment.js';
import { createImportApi } from '../../../ui/importApi.js';
import type { ApiFailure, ImportApi } from '../../../ui/importApi.js';
import { describeJob, isLive } from '../../../ui/jobScreen.js';
import type { ScreenAction } from '../../../ui/jobScreen.js';
import { goTo } from '../../../ui/navigate.js';
import { Poller } from '../../../ui/poller.js';
import type { JobView } from '../../../web/jobView.js';

interface ImportJobViewProps {
  jobUrl: string;
  issuesUrl: string;
  startUrl: string;
  cancelUrl: string;
  resumeUrl: string;
  recheckUrl: string;
  deleteUrl: string;
  fileWithErrorsUrl: string;
  openUrl: string;
  gridUrl: string;
  newUrl: string;
  setting: { storeTimeZone: string } | null;
}

type Urls = {
  job: string;
  issues: string;
  start: string;
  cancel: string;
  resume: string;
  recheck: string;
  remove: string;
  fileWithErrors: string;
  open: string;
  grid: string;
  newImport: string;
};

/** The states in which a button may be held back by another import (Start, Resume). */
const WATCHES_OTHERS: readonly JobStatus[] = [
  'validated',
  'stopped',
  'interrupted'
];

/** The calls behind the buttons that change the job. */
const CALLS = {
  start: (api: ImportApi, u: Urls) => api.start(u.start),
  cancel: (api: ImportApi, u: Urls) => api.cancel(u.cancel),
  resume: (api: ImportApi, u: Urls) => api.resume(u.resume),
  recheck: (api: ImportApi, u: Urls) => api.recheck(u.recheck),
  delete: (api: ImportApi, u: Urls) => api.remove(u.remove)
} as const;

/**
 * The page of one import (§ 8.2). It reads the job from the API, asks again every
 * five seconds while the job is at work and the tab is visible, and keeps the last
 * state it knew when the server pushes back. `describeJob` decides what to show;
 * `JobScreenView` shows it.
 */
export default function ImportJobView(props: ImportJobViewProps) {
  const urls: Urls = {
    job: props.jobUrl,
    issues: props.issuesUrl,
    start: props.startUrl,
    cancel: props.cancelUrl,
    resume: props.resumeUrl,
    recheck: props.recheckUrl,
    remove: props.deleteUrl,
    fileWithErrors: props.fileWithErrorsUrl,
    open: props.openUrl,
    grid: props.gridUrl,
    newImport: props.newUrl
  };
  const api = useMemo(
    () => createImportApi(axiosHttp, () => browserEnvironment.now()),
    []
  );
  const { openAlert, closeAlert } = useAlertContext();
  const [job, setJob] = useState<JobView | null>(null);
  const [others, setOthers] = useState<JobView[]>([]);
  const [pending, setPending] = useState<ScreenAction | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [gone, setGone] = useState(false);
  const [now, setNow] = useState(() => browserEnvironment.now());
  const poller = useRef<Poller<JobView> | null>(null);

  // The job, and the page's clock for "has not started yet".
  useEffect(() => {
    const instance = new Poller<JobView>({
      env: browserEnvironment,
      fetch: () => api.getJob(urls.job),
      keepGoing: (value) => isLive(value.status),
      onValue: (value) => {
        setJob(value);
        setStale(false);
        setNow(browserEnvironment.now());
      },
      onFailure: (failure: ApiFailure, retryInMs) => {
        if (retryInMs === null) {
          // The job is gone (404), or the session ended: asking again cannot help.
          setGone(failure.status === 404);
          setRefusal(refusalMessage(failure));
        } else {
          setStale(true);
        }
      }
    });
    poller.current = instance;
    instance.start();
    return () => instance.stop();
  }, [api, urls.job]);

  // Another import that holds Start or Resume back: asked while the job waits for a click.
  const status = job?.status;
  useEffect(() => {
    if (status === undefined || !WATCHES_OTHERS.includes(status)) {
      return undefined;
    }
    const instance = new Poller<JobView[]>({
      env: browserEnvironment,
      fetch: () => api.listOpen(urls.open),
      // Goes on only while an import is at work: that is what holds the button.
      keepGoing: (list) =>
        list.some((o) => o.status === 'queued' || o.status === 'running'),
      onValue: setOthers
    });
    instance.start();
    return () => instance.stop();
  }, [api, urls.open, status]);

  // The dialog of Cancel and Delete stays on screen while it fades out: a second
  // click on its button must not send the call again (the second Cancel would be
  // refused as a wrong status, the second Delete as a job that is not there).
  const running = useRef(false);
  const run = async (action: keyof typeof CALLS) => {
    if (running.current) return;
    running.current = true;
    try {
      setPending(action);
      setRefusal(null);
      const result = await CALLS[action](api, urls);
      setPending(null);
      if (!result.ok) {
        setRefusal(refusalMessage(result.error));
        // The job may have moved on without this page knowing (a worker, another admin).
        poller.current?.refresh();
        return;
      }
      if (action === 'delete') {
        toast.success(_('The import was deleted.'));
        goTo(urls.grid);
        return;
      }
      setJob(result.data);
      // Restart the asking with the new state: a job that is at work again needs it.
      poller.current?.start(result.data);
    } finally {
      running.current = false;
    }
  };

  const onAction = (action: ScreenAction) => {
    // The two buttons that cannot be undone ask first.
    if (action === 'cancel' || action === 'delete') {
      const deleting = action === 'delete';
      openAlert({
        heading: deleting ? _('Delete this import?') : _('Cancel this import?'),
        content: deleting
          ? _(
              'The file and the list of problems are deleted. The rows already imported stay in the store.'
            )
          : _(
              'The import stops after the row it is working on. The rows already imported stay in the store.'
            ),
        primaryAction: {
          title: _('Keep it'),
          onAction: closeAlert,
          variant: 'secondary'
        },
        secondaryAction: {
          title: deleting ? _('Delete') : _('Cancel the import'),
          onAction: () => {
            closeAlert();
            run(action);
          },
          variant: 'destructive'
        }
      });
      return;
    }
    if (action in CALLS) run(action as keyof typeof CALLS);
  };

  if (gone) {
    return (
      <div className="w-2/3 mx-auto text-center text-muted-foreground">
        {refusal}
      </div>
    );
  }
  if (job === null) {
    return (
      <div className="w-2/3 mx-auto text-center text-muted-foreground">
        {refusal ?? _('Loading...')}
      </div>
    );
  }
  const screen = describeJob(job, { others, nowMs: now });
  return (
    <div className="w-2/3 mx-auto">
      <JobScreenView
        job={job}
        screen={screen}
        pending={pending}
        refusal={refusal}
        stale={stale}
        timeZone={props.setting?.storeTimeZone}
        urls={{
          newImport: urls.newImport,
          fileWithErrors: urls.fileWithErrors
        }}
        onAction={onAction}
        problems={
          screen.problems ? (
            <ProblemsTable api={api} issuesUrl={urls.issues} />
          ) : null
        }
      />
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query {
    jobUrl: url(routeId: "getImportJob", params: [{key: "id", value: getContextValue("importJobUuid")}])
    issuesUrl: url(routeId: "getImportIssues", params: [{key: "id", value: getContextValue("importJobUuid")}])
    startUrl: url(routeId: "startImportJob", params: [{key: "id", value: getContextValue("importJobUuid")}])
    cancelUrl: url(routeId: "cancelImportJob", params: [{key: "id", value: getContextValue("importJobUuid")}])
    resumeUrl: url(routeId: "resumeImportJob", params: [{key: "id", value: getContextValue("importJobUuid")}])
    recheckUrl: url(routeId: "recheckImportJob", params: [{key: "id", value: getContextValue("importJobUuid")}])
    deleteUrl: url(routeId: "deleteImportJob", params: [{key: "id", value: getContextValue("importJobUuid")}])
    fileWithErrorsUrl: url(routeId: "downloadFileWithErrors", params: [{key: "id", value: getContextValue("importJobUuid")}])
    openUrl: url(routeId: "listOpenImportJobs")
    gridUrl: url(routeId: "importGrid")
    newUrl: url(routeId: "importNew")
    setting {
      storeTimeZone
    }
  }
`;
