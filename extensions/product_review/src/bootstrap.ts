import { defaultPaginationFilters } from "@evershop/evershop/lib/util/defaultPaginationFilters";
import { addProcessor } from "@evershop/evershop/lib/util/registry";
import registerDefaultReviewCollectionFilters from "./services/registerDefaultReviewCollectionFilters.js";
import { GraphQLFilter } from "@evershop/evershop";

export default () => {
  // Reigtering the default filters for attribute collection
  addProcessor(
    "productReviewCollectionFilters",
    registerDefaultReviewCollectionFilters,
    1
  );
  addProcessor(
    "productReviewCollectionFilters",
    (filters) => [...(filters as GraphQLFilter[]), ...defaultPaginationFilters],
    2
  );
};
