import { Button } from '@components/common/ui/Button.js';
import { Input } from '@components/common/ui/Input.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';
import type { ImportApi, IssuesPage } from '../ui/importApi.js';
import {
  codesBySize,
  noIssueFilters,
  pageCount,
  toQuery,
  withFilter
} from '../ui/issueFilters.js';
import type { IssueFilters } from '../ui/issueFilters.js';
import { formatNumber } from './format.js';

export interface ProblemsTableProps {
  api: ImportApi;
  issuesUrl: string;
}

const selectClass =
  'border-input dark:bg-input/30 h-9 rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

/**
 * The problems of the job (§ 8.2): the totals per type, three filters, and the
 * rows a page at a time. The messages come from the server in the admin's
 * language. The state of the filters is the table's own; a new filter goes back
 * to the first page.
 */
export function ProblemsTable({ api, issuesUrl }: ProblemsTableProps) {
  const [filters, setFilters] = useState<IssueFilters>(noIssueFilters);
  const [column, setColumn] = useState('');
  const [data, setData] = useState<IssuesPage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    // The cleanup aborts the ask of the filters that were just replaced, and an
    // aborted ask never shows: an older answer cannot replace a newer one.
    const controller = new AbortController();
    api
      .issues(issuesUrl, toQuery(filters), controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.ok) {
          setData(result.data);
          setFailed(null);
        } else {
          setFailed(result.error.message);
        }
      });
    return () => controller.abort();
  }, [api, issuesUrl, filters]);

  // The totals per type are those of the whole job, whatever the filters are.
  const types = codesBySize(data?.byCode ?? {});
  const pages = data ? pageCount(data.total, data.limit) : 1;

  return (
    <div className="grid gap-3" data-testid="problems">
      <h3 className="font-medium">{_('Problems')}</h3>
      {types.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">
            {_('Problems by type:')}
          </span>
          {types.map(({ code, count }) => (
            <button
              key={code}
              type="button"
              className={`underline-offset-2 hover:underline ${
                filters.code === code ? 'font-semibold' : ''
              }`}
              onClick={() =>
                setFilters(
                  withFilter(filters, {
                    code: filters.code === code ? '' : code
                  })
                )
              }
            >
              {code} x{formatNumber(count)}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <select
          aria-label={_('Severity')}
          className={selectClass}
          value={filters.severity}
          onChange={(e) =>
            setFilters(
              withFilter(filters, {
                severity: e.target.value as IssueFilters['severity']
              })
            )
          }
        >
          <option value="">{_('All severities')}</option>
          <option value="error">{_('Errors')}</option>
          <option value="warning">{_('Warnings')}</option>
        </select>
        <select
          aria-label={_('Type')}
          className={selectClass}
          value={filters.code}
          onChange={(e) =>
            setFilters(withFilter(filters, { code: e.target.value }))
          }
        >
          <option value="">{_('All types')}</option>
          {types.map(({ code }) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <Input
          aria-label={_('Column')}
          placeholder={_('Column')}
          className="w-48"
          value={column}
          onChange={(e) => setColumn(e.target.value)}
          onBlur={() => {
            if (column !== filters.column)
              setFilters(withFilter(filters, { column }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setFilters(withFilter(filters, { column }));
          }}
        />
      </div>
      {failed && <p className="text-sm text-destructive">{failed}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: '5rem' }}>{_('Row')}</TableHead>
            <TableHead>{_('Key')}</TableHead>
            <TableHead>{_('Column')}</TableHead>
            <TableHead>{_('Problem')}</TableHead>
            <TableHead>{_('Value')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.items ?? []).map((issue, i) => (
            <TableRow key={`${issue.row}-${issue.column}-${issue.code}-${i}`}>
              <TableCell>{issue.row ?? '--'}</TableCell>
              <TableCell
                className="max-w-48 truncate"
                title={issue.key ?? undefined}
              >
                {issue.key ?? '--'}
              </TableCell>
              <TableCell>{issue.column ?? '--'}</TableCell>
              <TableCell>
                <span
                  className={
                    issue.severity === 'error' ? '' : 'text-muted-foreground'
                  }
                >
                  {issue.message}
                </span>
              </TableCell>
              <TableCell
                className="max-w-48 truncate"
                title={issue.value ?? undefined}
              >
                {issue.value ?? ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {_('There is no problem to display.')}
        </p>
      )}
      {data?.truncated && (
        <p className="text-sm text-muted-foreground">
          {_('More problems exist than are listed.')}
        </p>
      )}
      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            {_('Previous')}
          </Button>
          <span>
            {_('Page ${page} of ${pages}', {
              page: formatNumber(filters.page),
              pages: formatNumber(pages)
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page >= pages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            {_('Next')}
          </Button>
        </div>
      )}
    </div>
  );
}
