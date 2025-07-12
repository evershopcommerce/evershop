import { setContextValue } from "@evershop/evershop/graphql/services";
import { buildFilterFromUrl } from "@evershop/evershop/lib/util/buildFilterFromUrl";

export default (request, response) => {
  setContextValue(request, "pageInfo", {
    title: "Reviews",
    description: "Reviews",
  });
  setContextValue(request, "filtersFromUrl", buildFilterFromUrl(request));
};
