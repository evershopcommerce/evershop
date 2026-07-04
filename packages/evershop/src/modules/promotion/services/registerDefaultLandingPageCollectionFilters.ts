import { getValueSync } from '../../../lib/util/registry.js';

/**
 * Default grid filters for the landing-page collection: name search, status,
 * and the `ob` sort key. Registered in promotion/bootstrap.js alongside the
 * pagination filters. Mirrors registerDefaultPageCollectionFilters (cms), but
 * single-table and with a boolean `status`.
 */
export async function registerDefaultLandingPageCollectionFilters() {
  const defaultFilters = [
    {
      key: 'name',
      operation: ['eq', 'like'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        if (operation === 'eq') {
          query.andWhere('landing_page.name', '=', value);
        } else {
          query.andWhere('landing_page.name', 'ilike', `%${value}%`);
        }
        currentFilters.push({ key: 'name', operation, value });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        const boolVal = value === true || value === 1 || value === '1' || value === 'true';
        query.andWhere('landing_page.status', '=', boolVal);
        currentFilters.push({ key: 'status', operation, value });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        const landingPageCollectionSortBy = getValueSync(
          'landingPageCollectionSortBy',
          {
            name: (q: any) => q.orderBy('landing_page.name'),
            status: (q: any) => q.orderBy('landing_page.status'),
            created_at: (q: any) => q.orderBy('landing_page.created_at')
          },
          {}
        );
        if (landingPageCollectionSortBy[value]) {
          landingPageCollectionSortBy[value](query, operation);
          currentFilters.push({ key: 'ob', operation, value });
        }
      }
    }
  ];

  return defaultFilters;
}
