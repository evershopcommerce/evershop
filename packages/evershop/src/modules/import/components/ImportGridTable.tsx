import { DummyColumnHeader } from '@components/admin/grid/header/Dummy.js';
import { SortableHeader } from '@components/admin/grid/header/Sortable.js';
import { Button } from '@components/common/ui/Button.js';
import { Checkbox } from '@components/common/ui/Checkbox.js';
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
import React, { useState } from 'react';
import type { JobStatus } from '../services/job/types.js';
import { IMPORT_ENTITIES } from '../services/types.js';
import type { ImportEntity, ImportMode } from '../services/types.js';
import { STATUS_FILTERS, countOf } from '../ui/gridUrl.js';
import type { GridFilters } from '../ui/gridUrl.js';
import { ChoiceSelect } from './ChoiceSelect.js';
import { formatNumber } from './format.js';
import { JobStatusBadge } from './JobStatusBadge.js';
import { entityLabel, modeLabel, statusLabel } from './labels.js';

/** A row of the list, as the GraphQL query gives it. */
export interface GridJob {
  uuid: string;
  entity: ImportEntity;
  mode: ImportMode;
  status: JobStatus;
  fileName: string;
  counts: Record<string, unknown> | null;
  createdByName: string | null;
  createdAt: { text: string } | null;
  viewUrl: string;
  /** A worker may be writing: the job cannot be deleted. */
  active: boolean;
}

export interface ImportGridTableProps {
  jobs: readonly GridJob[];
  currentFilters: Array<{ key: string; operation: string; value: string }>;
  filters: GridFilters;
  selected: readonly string[];
  onSelect(selected: string[]): void;
  /** A filter changed: the page goes to the address with it. */
  onFilter(change: Partial<GridFilters>): void;
  onClear(): void;
  onDelete(): void;
}

const cell = (value: number | null) =>
  value === null ? '--' : formatNumber(value);

/**
 * The table of past imports (spec 8.1): date, file, type, mode, status, rows,
 * created, updated, failed and who uploaded. A file opens its page. A job that
 * is at work cannot be selected, because it cannot be deleted.
 */
export function ImportGridTable(props: ImportGridTableProps) {
  const { jobs, selected, filters, currentFilters } = props;
  const [file, setFile] = useState(filters.file);
  const deletable = jobs.filter((job) => !job.active).map((job) => job.uuid);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label={_('Search')}
          placeholder={_('Search')}
          className="w-64"
          value={file}
          onChange={(e) => setFile(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') props.onFilter({ file });
          }}
        />
        <ChoiceSelect
          label={_('Status')}
          className="w-44"
          value={filters.status}
          choices={[
            { value: '', label: _('All statuses') },
            ...STATUS_FILTERS.map((status) => ({
              value: status,
              label: statusLabel(status)
            }))
          ]}
          onChange={(status) => props.onFilter({ status })}
        />
        <ChoiceSelect
          label={_('Type')}
          className="w-48"
          value={filters.entity}
          choices={[
            { value: '', label: _('All types') },
            ...(Object.keys(IMPORT_ENTITIES) as ImportEntity[]).map(
              (entity) => ({ value: entity, label: entityLabel(entity) })
            )
          ]}
          onChange={(entity) => props.onFilter({ entity })}
        />
        <Button variant="link" onClick={props.onClear}>
          {_('Clear filter')}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: '2rem' }}>
              <Checkbox
                aria-label={_('Select all')}
                checked={
                  deletable.length > 0 && selected.length === deletable.length
                }
                disabled={deletable.length === 0}
                onCheckedChange={(checked) =>
                  props.onSelect(checked ? deletable : [])
                }
              />
            </TableHead>
            <SortableHeader
              title={_('Date')}
              name="created_at"
              currentFilters={currentFilters}
            />
            <SortableHeader
              title={_('File')}
              name="file_name"
              currentFilters={currentFilters}
            />
            <SortableHeader
              title={_('Type')}
              name="entity"
              currentFilters={currentFilters}
            />
            <DummyColumnHeader title={_('Mode')} />
            <SortableHeader
              title={_('Status')}
              name="status"
              currentFilters={currentFilters}
            />
            <DummyColumnHeader title={_('Rows')} />
            <DummyColumnHeader title={_('Created')} />
            <DummyColumnHeader title={_('Updated')} />
            <DummyColumnHeader title={_('Failed')} />
            <DummyColumnHeader title={_('By')} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {selected.length > 0 && (
            <TableRow>
              <TableCell colSpan={100}>
                <Button variant="outline" onClick={props.onDelete}>
                  {_('Delete')}
                </Button>
              </TableCell>
            </TableRow>
          )}
          {jobs.map((job) => (
            <TableRow key={job.uuid}>
              <TableCell style={{ width: '2rem' }}>
                <Checkbox
                  aria-label={_('Select ${name}', { name: job.fileName })}
                  checked={selected.includes(job.uuid)}
                  disabled={job.active}
                  onCheckedChange={(checked) =>
                    props.onSelect(
                      checked
                        ? selected.concat([job.uuid])
                        : selected.filter((id) => id !== job.uuid)
                    )
                  }
                />
              </TableCell>
              <TableCell>{job.createdAt?.text ?? '--'}</TableCell>
              <TableCell className="max-w-xs truncate" title={job.fileName}>
                <a href={job.viewUrl} className="hover:underline font-medium">
                  {job.fileName}
                </a>
              </TableCell>
              <TableCell>{entityLabel(job.entity)}</TableCell>
              <TableCell>{modeLabel(job.entity, job.mode)}</TableCell>
              <TableCell>
                <JobStatusBadge
                  status={job.status}
                  errors={countOf(job.counts, 'errors')}
                />
              </TableCell>
              <TableCell>{cell(countOf(job.counts, 'total'))}</TableCell>
              <TableCell>{cell(countOf(job.counts, 'created'))}</TableCell>
              <TableCell>{cell(countOf(job.counts, 'updated'))}</TableCell>
              <TableCell>{cell(countOf(job.counts, 'failed'))}</TableCell>
              <TableCell>{job.createdByName ?? '--'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {jobs.length === 0 && (
        <div className="flex w-full justify-center mt-2 text-muted-foreground">
          {_(
            'No import yet. Upload a CSV file to import products, categories, customers or customer addresses.'
          )}
        </div>
      )}
    </div>
  );
}
