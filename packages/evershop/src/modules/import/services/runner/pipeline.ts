import type { Readable } from 'stream';
import { categoryValidator } from '../entities/category/categoryValidator.js';
import type {
  EntityValidator,
  HeaderInfo,
  ValidationContext
} from '../entities/definition.js';
import type { ImageFetcher } from '../images/types.js';
import { planCategories } from '../plan/categoryPlan.js';
import type { Clock } from '../ports/clock.js';
import type { EntityServices } from '../ports/services.js';
import type { CsvLimits } from '../reader/readCsv.js';
import type { ImportEntity } from '../types.js';
import { writeCategories } from '../write/categoryWriter.js';
import type { WriteOutcome } from '../write/categoryWriter.js';

export interface PipelineWriteArgs {
  open: () => Readable;
  limits?: Partial<CsvLimits>;
  header: HeaderInfo;
  state: unknown;
  plan: unknown;
  context: ValidationContext;
  services: EntityServices;
  images: ImageFetcher;
  clock: Pick<Clock, 'sleep'>;
  resumed: boolean;
  include?: (unit: { unit: number; rowNumber: number; key: string }) => boolean;
  signal?: AbortSignal;
}

/**
 * What an entity brings to the runner: how its file is checked, how its units
 * are ordered, and how they are written. The runner is the same for every entity;
 * the categories are the first.
 */
export interface EntityPipeline {
  entity: ImportEntity;
  validator: EntityValidator<any, any>;
  /** Orders the units from what the first pass remembered. */
  plan(state: unknown): unknown;
  write(args: PipelineWriteArgs): AsyncGenerator<WriteOutcome, void, undefined>;
}

const categoryPipeline: EntityPipeline = {
  entity: 'category',
  validator: categoryValidator,
  plan: (state) => planCategories(state as never),
  write: (args) =>
    writeCategories({
      ...args,
      state: args.state as never,
      plan: args.plan as never
    })
};

const PIPELINES: Partial<Record<ImportEntity, EntityPipeline>> = {
  category: categoryPipeline
};

/** The pipeline of an entity, or null when it cannot be imported yet. */
export function pipelineFor(entity: ImportEntity): EntityPipeline | null {
  return PIPELINES[entity] ?? null;
}
