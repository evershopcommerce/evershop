import { emptyCounts } from '../../../services/job/types.js';
import type { JobCounts } from '../../../services/job/types.js';
import type { JobView } from '../../../web/jobView.js';

/** A job as `GET /import-jobs/:id` shows it, with what a test says changed. */
export function aJob(
  over: Partial<Omit<JobView, 'counts'>> & { counts?: Partial<JobCounts> } = {}
): JobView {
  const { counts, ...rest } = over;
  return {
    uuid: '6f1d9a52-0000-4000-8000-000000000001',
    entity: 'product',
    mode: 'upsert',
    status: 'validated',
    stage: null,
    cancelRequested: false,
    fileName: 'products.csv',
    fileSize: 1000,
    options: {},
    counts: { ...emptyCounts(), total: 100, ...counts },
    errorMessage: null,
    createdAt: '2026-10-19T09:00:00.000Z',
    statusChangedAt: '2026-10-19T09:00:30.000Z',
    validatedAt: null,
    startedAt: null,
    finishedAt: null,
    expiresAt: null,
    waitingSince: null,
    createdBy: { id: 1, name: 'Jane' },
    ...rest
  };
}
