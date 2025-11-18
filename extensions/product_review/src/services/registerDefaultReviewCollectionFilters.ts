import { OPERATION_MAP } from "@evershop/evershop/lib/util/filterOperationMap";
import { getValueSync } from "@evershop/evershop/lib/util/registry";

export default async function registerDefaultReviewCollectionFilters() {
  // List of default supported filters
  const defaultFilters = [
    {
      key: "keyword",
      operation: "like",
      callback: (query, operation, value, currentFilters) => {
        query
          .andWhere("product_description.name", "ILIKE", `%${value}%`)
          .or("product_review.customer_name", "ILIKE", `%${value}%`)
          .or("product_review.comment", "ILIKE", `%${value}%`);
        currentFilters.push({
          key: "keyword",
          operation,
          value,
        });
      },
    },
    {
      key: "status",
      operation: "eq",
      callback: (query, operation, value, currentFilters) => {
        query.andWhere(
          "product_review.status",
          OPERATION_MAP[operation],
          value
        );
        currentFilters.push({
          key: "status",
          operation,
          value,
        });
      },
    },
    {
      key: "ob",
      operation: "eq",
      callback: (query, operation, value, currentFilters) => {
        const productReviewCollectionSortBy = getValueSync(
          "productReviewCollectionSortBy",
          {
            product: (query) => query.orderBy("product_description.name"),
            rating: (query) => query.orderBy("product_review.rating"),
            status: (query) => query.orderBy("product_review.approved"),
          },
          {}
        );

        if (productReviewCollectionSortBy[value]) {
          productReviewCollectionSortBy[value](query, operation);
          currentFilters.push({
            key: "ob",
            operation,
            value,
          });
        }
      },
    },
  ];

  return defaultFilters;
}
