import { createHash } from 'crypto';
import { generateFileName } from '../../../../cms/services/generateFileName.js';
import { categoryValidator } from '../../../services/entities/category/categoryValidator.js';
import { productValidator } from '../../../services/entities/product/productValidator.js';
import type { CategoryPlan } from '../../../services/plan/categoryPlan.js';
import { planCategories } from '../../../services/plan/categoryPlan.js';
import { planProducts } from '../../../services/plan/productPlan.js';
import type { StoreFixture } from '../../../services/ports/lookup.js';
import type { CsvLimits } from '../../../services/reader/readCsv.js';
import type { ImportMode } from '../../../services/types.js';
import { indexFile } from '../../../services/validate/validateFile.js';
import { writeCategories } from '../../../services/write/categoryWriter.js';
import type {
  CategoryWriterArgs,
  WriteOutcome
} from '../../../services/write/categoryWriter.js';
import { writeProducts } from '../../../services/write/productWriter.js';
import { FakeClock } from '../../../testing/FakeClock.js';
import { FakeImageFetcher } from '../../../testing/FakeImageFetcher.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { MemoryServices } from '../../../testing/MemoryServices.js';
import { RecordingServices } from '../../../testing/RecordingServices.js';
import { chunked } from './readAll.js';

export const keyDeps = {
  sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex'),
  sanitizeFileName: generateFileName as (original: string) => string
};

export interface ImportRun {
  outcomes: WriteOutcome[];
  plan: CategoryPlan;
  lookup: MemoryLookup;
  memory: MemoryServices;
  services: RecordingServices;
  images: FakeImageFetcher;
  clock: FakeClock;
}

export interface ImportOptions {
  mode?: ImportMode;
  store?: StoreFixture;
  resumed?: boolean;
  include?: CategoryWriterArgs['include'];
  batchSize?: number;
  limits?: Partial<CsvLimits>;
  signal?: AbortSignal;
  /** Set up failures before the run. */
  prepare?: (run: Omit<ImportRun, 'outcomes' | 'plan'>) => void;
  /** Stop after this many outcomes (the way the runner stops at the tenth failure). */
  stopAfter?: number;
}

/**
 * Index a category file, plan it and write it on an in-memory store, the way the
 * runner will: no validation first, so that the writer is shown on its own.
 */
export async function importCategories(
  file: string,
  options: ImportOptions = {}
): Promise<ImportRun> {
  const lookup = new MemoryLookup(options.store);
  const memory = new MemoryServices(lookup);
  const services = new RecordingServices(memory);
  const clock = new FakeClock();
  const images = new FakeImageFetcher(keyDeps).hasImage(
    'https://example.com/women.jpg'
  );
  const run = { lookup, memory, services, images, clock };
  options.prepare?.(run);
  const context = {
    lookup,
    mode: options.mode ?? 'upsert',
    now: () => clock.now(),
    sha256Hex: keyDeps.sha256Hex
  };
  const open = () => chunked(file);
  const indexed = await indexFile({
    validator: categoryValidator,
    context,
    open,
    limits: options.limits
  });
  if (indexed.header === null) throw new Error('The test file has no header');
  const plan = planCategories(indexed.state);
  const outcomes: WriteOutcome[] = [];
  for await (const outcome of writeCategories({
    open,
    limits: options.limits,
    header: indexed.header,
    state: indexed.state,
    plan,
    context,
    services,
    images,
    clock,
    resumed: options.resumed,
    include: options.include,
    signal: options.signal,
    batchSize: options.batchSize
  })) {
    outcomes.push(outcome);
    if (
      options.stopAfter !== undefined &&
      outcomes.length >= options.stopAfter
    ) {
      break;
    }
  }
  return { ...run, outcomes, plan };
}

/** The same for a products file: indexed, planned and written, without a check first. */
export async function importProducts(
  file: string,
  options: ImportOptions = {}
): Promise<Omit<ImportRun, 'plan'>> {
  const lookup = new MemoryLookup(options.store);
  const memory = new MemoryServices(lookup);
  const services = new RecordingServices(memory);
  const clock = new FakeClock();
  const images = new FakeImageFetcher(keyDeps)
    .hasImage('https://example.com/tee.jpg')
    .hasImage('https://example.com/a.jpg')
    .hasImage('https://example.com/b.jpg');
  const run = { lookup, memory, services, images, clock };
  options.prepare?.(run);
  const context = {
    lookup,
    mode: options.mode ?? 'upsert',
    now: () => clock.now(),
    sha256Hex: keyDeps.sha256Hex
  };
  const open = () => chunked(file);
  const indexed = await indexFile({
    validator: productValidator,
    context,
    open,
    limits: options.limits
  });
  if (indexed.header === null) throw new Error('The test file has no header');
  const plan = planProducts(indexed.state);
  const outcomes: WriteOutcome[] = [];
  for await (const outcome of writeProducts({
    open,
    limits: options.limits,
    header: indexed.header,
    state: indexed.state,
    plan,
    context,
    services,
    images,
    clock,
    resumed: options.resumed,
    include: options.include,
    signal: options.signal,
    batchSize: options.batchSize
  })) {
    outcomes.push(outcome);
    if (
      options.stopAfter !== undefined &&
      outcomes.length >= options.stopAfter
    ) {
      break;
    }
  }
  return { ...run, outcomes };
}
