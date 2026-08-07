export interface FilterInput {
  key: string;
  operation:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gteq'
    | 'lt'
    | 'lteq'
    | 'like'
    | 'nlike'
    | 'in'
    | 'nin';
  value: string;
}

/**
 * Build filter inputs from URL parameters
 *
 * Supports both complete URLs and relative URL paths (like request.originalUrl).
 * For relative URLs, a dummy domain is added to make them valid for URL parsing.
 *
 * @param url - Complete URL, relative URL path, or URL object
 * @returns Array of FilterInput objects
 *
 * @example
 * // Complete URL
 * buildFilterFromUrl('https://example.com/products?color=red&size=large')
 *
 * // Relative URL (from request.originalUrl)
 * buildFilterFromUrl('/products?color=red&size=large')
 *
 * // Multi-value filters
 * buildFilterFromUrl('/products?color=red&color=blue') // Creates 'in' operation
 *
 * // Complex filters
 * buildFilterFromUrl('/products?price[operation]=range&price[value]=10,100')
 */
export const buildFilterFromUrl = (url: string | URL): FilterInput[] => {
  let urlObj: URL;

  if (typeof url === 'string') {
    // Check if it's a relative URL (starts with / or doesn't contain ://)
    if (url.startsWith('/') || !url.includes('://')) {
      // Add dummy domain to make it a valid URL for URL constructor
      urlObj = new URL(url, 'https://example.com');
    } else {
      // It's already a complete URL
      urlObj = new URL(url);
    }
  } else {
    // It's already a URL object
    urlObj = url;
  }

  // Get the search parameters
  const searchParams = urlObj.searchParams;

  if (!searchParams) {
    return [];
  }

  const filtersFromUrl: FilterInput[] = [];
  const processedKeys = new Set<string>();

  // Iterate through all search parameters
  for (const [key, value] of searchParams.entries()) {
    // Handle operation-based filters like price[operation]=range&price[value]=10,100
    if (key.includes('[operation]')) {
      const filterKey = key.replace('[operation]', '');
      const filterValue = searchParams.get(`${filterKey}[value]`);

      if (filterValue && isValidOperation(value)) {
        filtersFromUrl.push({
          key: filterKey,
          operation: value as FilterInput['operation'],
          value: filterValue
        });
        processedKeys.add(filterKey);
      }
    }
    // Handle simple equality filters like color=red&size=large
    // Also handle multi-value case like color=black&color=blue
    else if (!key.includes('[value]') && !processedKeys.has(key)) {
      const allValues = searchParams.getAll(key);

      if (allValues.length > 1) {
        // Multiple values for the same key, use 'in' operation
        filtersFromUrl.push({
          key,
          operation: 'in',
          value: allValues.join(',')
        });
      } else {
        // Single value, use 'eq' operation
        filtersFromUrl.push({
          key,
          operation: 'eq',
          value
        });
      }
      processedKeys.add(key);
    }
  }

  return filtersFromUrl;
};

// Helper function to validate operation
const isValidOperation = (
  operation: string
): operation is FilterInput['operation'] => {
  return [
    'eq',
    'neq',
    'gt',
    'gteq',
    'lt',
    'lteq',
    'like',
    'nlike',
    'in',
    'nin'
  ].includes(operation);
};
