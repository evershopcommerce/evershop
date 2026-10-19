import type { ProductState } from '../entities/product/productValidator.js';

/**
 * The order in which the products are written (§ 4.3): the order of the file. A
 * unit is one row, or all the rows of one variant group, which are next to each
 * other (PRD-17), so the units are told apart by reading the rows, not by a
 * table made in advance. There is no product-to-product dependency apart from
 * the group, so nothing is reordered.
 */
export interface ProductPlan {
  /** The number of rows the first pass indexed (the units are at most this many). */
  rows: number;
}

export function planProducts(state: ProductState): ProductPlan {
  return { rows: state.firstRow.size };
}
