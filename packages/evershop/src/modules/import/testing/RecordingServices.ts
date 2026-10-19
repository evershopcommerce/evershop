import type {
  CategoryWrite,
  EntityServices,
  ProductWrite
} from '../services/ports/services.js';

export interface RecordedCall {
  method:
    | 'createCategory'
    | 'updateCategory'
    | 'createProduct'
    | 'updateProduct'
    | 'createVariantGroup'
    | 'addVariantItem'
    | 'recordRedirects';
  /** The uuid of an update, or of the product of a join or of redirects. */
  uuid?: string;
  /** What the call was given (the fields of whichever write it is). */
  input: Record<string, unknown>;
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
    this.check({ method: 'createCategory', input: { ...input } });
    return this.inner.createCategory(input);
  }

  async updateCategory(uuid: string, input: CategoryWrite) {
    this.check({ method: 'updateCategory', uuid, input: { ...input } });
    return this.inner.updateCategory(uuid, input);
  }

  async createProduct(input: ProductWrite) {
    this.check({ method: 'createProduct', input: { ...input } });
    return this.inner.createProduct(input);
  }

  async updateProduct(uuid: string, input: ProductWrite) {
    this.check({ method: 'updateProduct', uuid, input: { ...input } });
    return this.inner.updateProduct(uuid, input);
  }

  async createVariantGroup(input: {
    attributeGroupId: number;
    axisCodes: string[];
  }) {
    this.check({ method: 'createVariantGroup', input: { ...input } });
    return this.inner.createVariantGroup(input);
  }

  async addVariantItem(groupUuid: string, productUuid: string) {
    this.check({
      method: 'addVariantItem',
      uuid: productUuid,
      input: { groupUuid }
    });
    return this.inner.addVariantItem(groupUuid, productUuid);
  }

  async recordRedirects(productUuid: string, fromPaths: string[]) {
    this.check({
      method: 'recordRedirects',
      uuid: productUuid,
      input: { fromPaths }
    });
    return this.inner.recordRedirects(productUuid, fromPaths);
  }
}
