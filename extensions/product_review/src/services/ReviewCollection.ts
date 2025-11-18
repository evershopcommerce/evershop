import { GraphQLFilter } from "@evershop/evershop";
import { pool } from "@evershop/evershop/lib/postgres";
import { camelCase } from "@evershop/evershop/lib/util/camelCase";
import { getValue } from "@evershop/evershop/lib/util/registry";
import { SelectQuery } from "@evershop/postgres-query-builder";

export type ProductReviewCollectionFilter = {
  key: string;
  operation: string[];
  callback: (
    query: SelectQuery,
    operation: string,
    value: any,
    currentFilters: GraphQLFilter[]
  ) => void;
};

class ReviewCollection {
  baseQuery: SelectQuery;
  totalQuery: SelectQuery;
  currentAppliedFilters: GraphQLFilter[] = [];
  constructor(baseQuery: SelectQuery) {
    this.baseQuery = baseQuery;
    this.baseQuery.orderBy("product_review.review_id", "DESC");
  }

  async init(filters: GraphQLFilter[] = [], isAdmin = false) {
    if (!isAdmin) {
      this.baseQuery.andWhere("product_review.approved", "=", "t");
    }
    const currentFilters: GraphQLFilter[] = [];

    // Apply the filters
    const productReviewCollectionFilters = await getValue<
      ProductReviewCollectionFilter[]
    >("productReviewCollectionFilters", []);

    productReviewCollectionFilters.forEach((filter) => {
      const check = filters.find((f) => f.key === filter.key);
      if (check) {
        if (filter.operation.includes(check.operation)) {
          filter.callback(
            this.baseQuery,
            check.operation,
            check.value,
            currentFilters
          );
        }
      }
    });

    // Clone the main query for getting total right before doing the paging
    const totalQuery = this.baseQuery.clone();
    totalQuery.select("COUNT(product_review.review_id)", "total");
    totalQuery.removeOrderBy();
    totalQuery.removeLimit();

    this.currentAppliedFilters = currentFilters;
    this.totalQuery = totalQuery;
  }

  async items() {
    const items = await this.baseQuery.execute(pool);
    return items.map((row) => camelCase(row));
  }

  async total() {
    // Call items to get the total
    const total = await this.totalQuery.execute(pool);
    return total[0].total;
  }

  currentFilters() {
    return this.currentAppliedFilters;
  }
}

export { ReviewCollection };
