import { useAlertContext } from '@components/common/modal/Alert.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { uploadFailureMessage } from '../../../components/labels.js';
import {
  NewImportView,
  confirmText
} from '../../../components/NewImportView.js';
import type { ImportEntity, ImportMode } from '../../../services/types.js';
import { axiosHttp } from '../../../ui/axiosHttp.js';
import { browserEnvironment } from '../../../ui/browserEnvironment.js';
import { createImportApi } from '../../../ui/importApi.js';
import { goTo } from '../../../ui/navigate.js';
import { Poller } from '../../../ui/poller.js';
import {
  describeUpload,
  isBusy,
  viewUrlFor
} from '../../../ui/uploadChoice.js';
import type { UploadNotice } from '../../../ui/uploadChoice.js';
import type { JobView } from '../../../web/jobView.js';

interface ImportNewFormProps {
  createUrl: string;
  openUrl: string;
  /** The page of a job, with the placeholder id (`viewUrlFor` puts the real one). */
  viewUrl: string;
  templateProductUrl: string;
  templateCategoryUrl: string;
  templateCustomerUrl: string;
  templateCustomerAddressUrl: string;
  currentAdminUser: { adminUserId: number } | null;
  importLimits: { maxFileBytes: number } | null;
  setting: { storeTimeZone: string } | null;
}

/**
 * The page "New import" (§ 8.2). It looks at the jobs of the type that was
 * chosen (and keeps looking while one is at work), asks before an upload closes
 * or replaces something that matters (D-32), sends the file with a bar, and goes
 * to the page of the new job. `describeUpload` decides what to show;
 * `NewImportView` shows it.
 */
export default function ImportNewForm(props: ImportNewFormProps) {
  const api = useMemo(
    () => createImportApi(axiosHttp, () => browserEnvironment.now()),
    []
  );
  const { openAlert, closeAlert } = useAlertContext();
  const [entity, setEntity] = useState<ImportEntity>('product');
  const [mode, setMode] = useState<ImportMode>('upsert');
  const [checkImages, setCheckImages] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [openJobs, setOpenJobs] = useState<JobView[]>([]);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef<AbortController | null>(null);
  // Set when the page itself leaves for the page of the new job: no question then.
  const leaving = useRef(false);

  const templates: Record<ImportEntity, string> = {
    product: props.templateProductUrl,
    category: props.templateCategoryUrl,
    customer: props.templateCustomerUrl,
    customerAddress: props.templateCustomerAddressUrl
  };
  const maxFileBytes = props.importLimits?.maxFileBytes ?? null;
  const me = props.currentAdminUser?.adminUserId ?? null;
  const timeZone = props.setting?.storeTimeZone;

  // The jobs of the chosen type: asked at once, and again while one is at work.
  useEffect(() => {
    const poller = new Poller<JobView[]>({
      env: browserEnvironment,
      fetch: () => api.listOpen(props.openUrl),
      keepGoing: (jobs) => jobs.some((j) => j.entity === entity && isBusy(j)),
      onValue: setOpenJobs
    });
    poller.start();
    return () => poller.stop();
  }, [api, props.openUrl, entity]);

  // A file on its way must not be lost by closing the tab by mistake.
  const uploading = percent !== null;
  useEffect(() => {
    if (!uploading) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      if (!leaving.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [uploading]);

  // Leaving the page ends the upload.
  useEffect(() => () => sending.current?.abort(), []);

  const choice = describeUpload({
    entity,
    openJobs,
    me,
    file,
    maxFileBytes,
    uploading
  });

  const ask = (notice: UploadNotice) =>
    new Promise<boolean>((resolve) => {
      const { heading, content } = confirmText(notice, timeZone);
      openAlert({
        heading,
        content,
        primaryAction: {
          title: _('Cancel'),
          onAction: () => {
            closeAlert();
            resolve(false);
          },
          variant: 'secondary'
        },
        secondaryAction: {
          title: _('Upload'),
          onAction: () => {
            closeAlert();
            resolve(true);
          },
          variant: 'destructive'
        }
      });
    });

  const send = async () => {
    if (file === null) return;
    const controller = new AbortController();
    sending.current = controller;
    setPercent(0);
    const result = await api.upload(
      props.createUrl,
      {
        entity,
        // Customer addresses are only ever added (D-18): the mode does not apply.
        mode: entity === 'customerAddress' ? 'upsert' : mode,
        checkImages: choice.showCheckImages && checkImages,
        file
      },
      (sent, total) =>
        setPercent(total > 0 ? Math.floor((sent / total) * 100) : 0),
      controller.signal
    );
    sending.current = null;
    if (result.ok) {
      leaving.current = true;
      goTo(viewUrlFor(props.viewUrl, result.data.job.uuid));
      return;
    }
    setPercent(null);
    if (!result.error.aborted) setError(uploadFailureMessage(result.error));
  };

  const submit = async () => {
    setError(null);
    // The notices may be old: look once more before sending a large file.
    const fresh = await api.listOpen(props.openUrl);
    const jobs = fresh.ok ? fresh.data : openJobs;
    if (fresh.ok) setOpenJobs(fresh.data);
    const now = describeUpload({
      entity,
      openJobs: jobs,
      me,
      file,
      maxFileBytes,
      uploading: false
    });
    if (!now.canUpload) return;
    for (const notice of now.confirm) {
      if (!(await ask(notice))) return;
    }
    await send();
  };

  return (
    <div className="w-2/3 mx-auto">
      <NewImportView
        entity={entity}
        mode={mode}
        checkImages={checkImages}
        file={file ? { name: file.name, size: file.size } : null}
        choice={choice}
        maxFileBytes={maxFileBytes}
        templateUrl={templates[entity]}
        timeZone={timeZone}
        viewUrlOf={(job) => viewUrlFor(props.viewUrl, job.uuid)}
        upload={percent === null ? null : { percent }}
        error={error}
        onEntity={(value) => {
          setEntity(value);
          setError(null);
        }}
        onMode={setMode}
        onCheckImages={setCheckImages}
        onFile={(value) => {
          setFile(value);
          setError(null);
        }}
        onSubmit={submit}
        onAbort={() => sending.current?.abort()}
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
    createUrl: url(routeId: "createImportJob")
    openUrl: url(routeId: "listOpenImportJobs")
    viewUrl: url(routeId: "importView", params: [{key: "id", value: "00000000-0000-0000-0000-000000000000"}])
    templateProductUrl: url(routeId: "downloadImportTemplate", params: [{key: "entity", value: "products"}])
    templateCategoryUrl: url(routeId: "downloadImportTemplate", params: [{key: "entity", value: "categories"}])
    templateCustomerUrl: url(routeId: "downloadImportTemplate", params: [{key: "entity", value: "customers"}])
    templateCustomerAddressUrl: url(routeId: "downloadImportTemplate", params: [{key: "entity", value: "customer-addresses"}])
    currentAdminUser {
      adminUserId
    }
    importLimits {
      maxFileBytes
    }
    setting {
      storeTimeZone
    }
  }
`;
