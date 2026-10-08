import { describe, it, expect } from '@jest/globals';
import { rewriteArea } from '../../services/landingPage/cloneWidgetBody.js';

const OLD = '11111111-1111-4111-8111-111111111111';
const NEW = '22222222-2222-4222-8222-222222222222';
const map = new Map([[OLD, NEW]]);

describe('rewriteArea (cloneWidgetBody)', () => {
  it('maps named areas through areaMap', () => {
    expect(rewriteArea('landing_page_content', map, { landing_page_content: 'content' })).toBe('content');
    expect(rewriteArea('content', map, { content: 'landing_page_content' })).toBe('landing_page_content');
  });

  it('leaves unknown named areas untouched', () => {
    expect(rewriteArea('headerTop', map, { landing_page_content: 'content' })).toBe('headerTop');
    expect(rewriteArea('content', map, {})).toBe('content');
  });

  it('re-points a container child area at the copied parent uuid', () => {
    expect(rewriteArea(`columnsContainer_${OLD}_col_2`, map)).toBe(`columnsContainer_${NEW}_col_2`);
  });

  it('keeps a child area whose parent is not in the clone map (orphan stays orphan)', () => {
    const other = '33333333-3333-4333-8333-333333333333';
    expect(rewriteArea(`columnsContainer_${other}_col_0`, map)).toBe(`columnsContainer_${other}_col_0`);
  });

  it('skips areaMap when asked (unique-index guard, spec P14) but still rewrites children', () => {
    expect(rewriteArea('content', map, { content: 'landing_page_content' }, true)).toBe('content');
    expect(rewriteArea(`columnsContainer_${OLD}_col_1`, map, { content: 'x' }, true)).toBe(`columnsContainer_${NEW}_col_1`);
  });
});
