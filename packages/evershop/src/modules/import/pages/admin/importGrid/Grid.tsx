import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import { Card, CardContent } from '@components/common/ui/Card.js';
import { toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useMemo, useState } from 'react';
import { ImportGridTable } from '../../../components/ImportGridTable.js';
import type { GridJob } from '../../../components/ImportGridTable.js';
import { axiosHttp } from '../../../ui/axiosHttp.js';
import { browserEnvironment } from '../../../ui/browserEnvironment.js';
import { clearedUrl, filteredUrl, readFilters } from '../../../ui/gridUrl.js';
import { createImportApi } from '../../../ui/importApi.js';
import { goTo } from '../../../ui/navigate.js';

interface ImportGridProps {
  importJobs: {
    items: Array<GridJob & { deleteApi: string }>;
    total: number;
    currentFilters: Array<{ key: string; operation: string; value: string }>;
  } | null;
}

/**
 * The list of past imports (spec 8.1): a normal admin grid with the usual
 * filters and paging, rows that open the page of the import, and Delete for
 * the imports that are not at work.
 */
export default function ImportGrid({ importJobs }: ImportGridProps) {
  const api = useMemo(
    () => createImportApi(axiosHttp, () => browserEnvironment.now()),
    []
  );
  const { openAlert, closeAlert } = useAlertContext();
  const [selected, setSelected] = useState<string[]>([]);
  const items = importJobs?.items ?? [];
  const total = importJobs?.total ?? 0;
  const currentFilters = importJobs?.currentFilters ?? [];
  const pageOf = (key: string, fallback: number) => {
    const value = currentFilters.find((f) => f.key === key)?.value;
    return value ? parseInt(value, 10) : fallback;
  };

  const remove = async () => {
    const results = await Promise.all(
      items
        .filter((job) => selected.includes(job.uuid))
        .map((job) => api.remove(job.deleteApi))
    );
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) {
      toast.error(
        _('${count} imports could not be deleted. They may have started.', {
          count: `${failed}`
        })
      );
    }
    goTo(window.location.href);
  };

  return (
    <div className="w-5/6 mx-auto">
      <Card>
        <CardContent>
          <ImportGridTable
            jobs={items}
            currentFilters={currentFilters}
            filters={readFilters(currentFilters)}
            selected={selected}
            onSelect={setSelected}
            onFilter={(change) =>
              goTo(filteredUrl(window.location.href, change))
            }
            onClear={() => goTo(clearedUrl(window.location.href))}
            onDelete={() =>
              openAlert({
                heading: _('Delete the selected imports?'),
                content: _(
                  'Their files and lists of problems are deleted. The rows already imported stay in the store.'
                ),
                primaryAction: {
                  title: _('Cancel'),
                  onAction: closeAlert,
                  variant: 'secondary'
                },
                secondaryAction: {
                  title: _('Delete'),
                  onAction: () => {
                    closeAlert();
                    remove();
                  },
                  variant: 'destructive'
                }
              })
            }
          />
          <GridPagination
            total={total}
            limit={pageOf('limit', 20)}
            page={pageOf('page', 1)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    importJobs(filters: $filters) {
      items {
        uuid
        entity
        mode
        status
        fileName
        counts
        createdByName
        createdAt {
          text(format: "yyyy-LL-dd HH:mm")
        }
        viewUrl
        active
        deleteApi
      }
      total
      currentFilters {
        key
        operation
        value
      }
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
