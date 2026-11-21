import { nodeSha256 } from '../../../adapters/nodeSha256.js';
import type { IssuePhase } from '../../../services/job/types.js';
import { ImportService } from '../../../services/jobs/ImportService.js';
import type { ImportServiceDeps } from '../../../services/jobs/ImportService.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { MemoryFileStore } from '../../../testing/MemoryFileStore.js';
import { MemoryJobStore } from '../../../testing/MemoryJobStore.js';
import { buildTemplate } from '../../../services/templates/importTemplate.js';
import type { HttpResult, ImportWeb } from '../../../web/ImportWeb.js';

export interface WebHarness {
  web: ImportWeb;
  store: MemoryJobStore;
  files: MemoryFileStore;
  logger: CollectingLogger;
  names: Map<number, string>;
}

/** An `ImportWeb` over the doubles of `testing/`: the handlers run without a server. */
export function makeWeb(
  options: Partial<ImportServiceDeps> & {
    limits?: { maxRows: number; maxCellLength: number };
  } = {}
): WebHarness {
  const store = new MemoryJobStore(new FakeClock());
  const files = new MemoryFileStore(8);
  const logger = new CollectingLogger();
  const names = new Map<number, string>([[7, 'Jane Doe']]);
  const { limits, ...serviceOptions } = options;
  const service = new ImportService({
    jobs: store,
    sha256: nodeSha256,
    maxFileBytes: 1_000_000,
    ...serviceOptions
  });
  const web: ImportWeb = {
    service,
    files,
    issuesInRowOrder: (jobId: number, phase: IssuePhase) =>
      store.issuesInRowOrder(jobId, phase),
    adminNames: async (ids) =>
      new Map(
        ids.flatMap((id) =>
          names.has(id) ? [[id, names.get(id)!] as const] : []
        )
      ),
    template: async (entity) =>
      buildTemplate(entity, {
        attributeCodes: ['color', 'size'],
        metafieldKeys: ['custom.material'],
        nameFormat: 'single'
      }),
    limits: limits ?? { maxRows: 200_000, maxCellLength: 65_536 },
    render: serviceOptions.render,
    logger
  };
  return { web, store, files, logger, names };
}

/** The JSON body of an answer. */
export function bodyOf(result: HttpResult): any {
  if (result.kind !== 'json') throw new Error('Expected a JSON answer');
  return result.body;
}

/** A stream answer, read to the end. */
export async function textOf(result: HttpResult): Promise<string> {
  if (result.kind !== 'stream') {
    throw new Error(`Expected a stream, got ${JSON.stringify(result)}`);
  }
  let text = '';
  for await (const chunk of result.body) text += chunk;
  return text;
}
