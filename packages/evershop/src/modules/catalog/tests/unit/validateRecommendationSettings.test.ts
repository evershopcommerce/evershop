import { describe, it, expect } from '@jest/globals';

const middleware = (
  await import(
    '../../api/saveSetting/[bodyParser,auth]validateRecommendationSettings[saveSetting].js'
  )
).default;

interface RunResult {
  statusCode: number | null;
  payload: { error: { message: string } } | null;
  nextCalled: boolean;
}

function run(body: unknown): Promise<RunResult> {
  const result: RunResult = { statusCode: null, payload: null, nextCalled: false };
  const response = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: RunResult['payload']) {
      result.payload = payload;
    }
  };
  const call = middleware as (
    request: unknown,
    response: unknown,
    next: () => void
  ) => Promise<void>;
  return Promise.resolve(
    call({ body }, response, () => {
      result.nextCalled = true;
    })
  ).then(() => result);
}

describe('saveSetting recommendation validation middleware', () => {
  it('passes through a settings save that carries no recommendation keys', async () => {
    const result = await run({ storeName: 'My store' });
    expect(result.nextCalled).toBe(true);
    expect(result.statusCode).toBeNull();
  });

  it('passes an empty/missing body (generic upsert tolerance)', async () => {
    const result = await run(undefined);
    expect(result.nextCalled).toBe(true);
  });

  it('accepts a valid full recommendation payload, typed and string-typed scalars alike', async () => {
    const result = await run({
      relatedProductsRules: {
        enabled: true,
        rules: [{ type: 'same_category', enabled: true }],
        priceBand: { enabled: false, percent: 30 },
        fallbackToBestsellers: true
      },
      crossSellMinPairCount: '3',
      crossSellMinAnchorOrders: 5,
      crossSellMinLift: '1.2',
      crossSellFallbackEnabled: true
    });
    expect(result.nextCalled).toBe(true);
  });

  it('accepts relatedProductsRules: null — the reset-to-default path', async () => {
    const result = await run({ relatedProductsRules: null });
    expect(result.nextCalled).toBe(true);
  });

  it('rejects an invalid rules object with the schema message', async () => {
    const result = await run({
      relatedProductsRules: { enabled: true, rules: 'same_category' }
    });
    expect(result.nextCalled).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.payload?.error.message).toBeTruthy();
  });

  it('rejects out-of-range gates', async () => {
    const badBodies: unknown[] = [
      { crossSellMinPairCount: '0' },
      { crossSellMinPairCount: 0 },
      { crossSellMinAnchorOrders: '-1' },
      { crossSellMinLift: 'abc' },
      { crossSellFallbackEnabled: 'maybe' }
    ];
    for (const body of badBodies) {
      const result = await run(body);
      expect(result.nextCalled).toBe(false);
      expect(result.statusCode).toBe(400);
    }
  });
});
