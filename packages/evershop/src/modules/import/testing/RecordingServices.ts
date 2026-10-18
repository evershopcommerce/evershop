import type {
  CategoryWrite,
  EntityServices
} from '../services/ports/services.js';

export interface RecordedCall {
  method: 'createCategory' | 'updateCategory';
  /** The uuid of an update. */
  uuid?: string;
  input: CategoryWrite;
}

interface Failure {
  match: (call: RecordedCall) => boolean;
  error: () => Error;
  times: number;
}

/**
 * TEST-ONLY (§ 4.5, point 2). Wraps another `EntityServices`, records every call
 * (also the ones that fail) and can make a call fail: `failOn(match, error)`.
 */
export class RecordingServices implements EntityServices {
  readonly calls: RecordedCall[] = [];

  private readonly failures: Failure[] = [];

  constructor(private readonly inner: EntityServices) {}

  /**
   * Makes the calls that `match` throw `error`, `times` times (always by
   * default). A call that is let through is passed on.
   */
  failOn(
    match: (call: RecordedCall) => boolean,
    error: Error | (() => Error),
    times = Infinity
  ): this {
    this.failures.push({
      match,
      error: typeof error === 'function' ? error : () => error,
      times
    });
    return this;
  }

  /** Forgets every failure that was asked for: the cause was fixed. */
  clearFailures(): void {
    this.failures.length = 0;
  }

  private check(call: RecordedCall): void {
    this.calls.push(call);
    for (const failure of this.failures) {
      if (failure.times > 0 && failure.match(call)) {
        failure.times -= 1;
        throw failure.error();
      }
    }
  }

  async createCategory(input: CategoryWrite) {
    this.check({ method: 'createCategory', input });
    return this.inner.createCategory(input);
  }

  async updateCategory(uuid: string, input: CategoryWrite) {
    this.check({ method: 'updateCategory', uuid, input });
    return this.inner.updateCategory(uuid, input);
  }
}
