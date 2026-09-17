import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
import { Badge } from '@components/common/ui/Badge.js';
import { Button } from '@components/common/ui/Button.js';
import { ButtonGroup } from '@components/common/ui/ButtonGroup.js';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader
} from '@components/common/ui/Card.js';
import { Checkbox } from '@components/common/ui/Checkbox.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@components/common/ui/Table.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import { User } from 'lucide-react';
import React, { useState } from 'react';

interface SubmissionRow {
  uuid: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: string;
  emailSent?: boolean | null;
  emailError?: string | null;
  createdAt?: { text?: string | null } | null;
  customer?: {
    uuid: string;
    fullName?: string | null;
    editUrl: string;
  } | null;
  updateApi: string;
  deleteApi: string;
}

interface Filter {
  key: string;
  operation: string;
  value: string;
}

const STATUS_VARIANT: Record<string, 'warning' | 'secondary' | 'destructive'> =
  {
    unread: 'warning',
    read: 'secondary',
    spam: 'destructive'
  };

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] || 'secondary'}>{status}</Badge>
  );
}

/**
 * A message that never reached the store's inbox is the failure this grid
 * exists to make visible — a merchant who only ever checks their email would
 * otherwise never learn their mail setup is broken.
 */
function DeliveryBadge({ row }: { row: SubmissionRow }) {
  if (row.status === 'spam' || row.emailSent) {
    return null;
  }
  return (
    <div
      className="text-sm text-destructive mt-1"
      title={row.emailError || undefined}
    >
      {_('Not emailed')}
      {row.emailError ? ` · ${row.emailError}` : ''}
    </div>
  );
}

/**
 * The sender's email matched a registered account. Resolved live at query time,
 * so it reflects the account as it is now, not as it was when the message
 * arrived.
 */
function CustomerBadge({ row }: { row: SubmissionRow }) {
  if (!row.customer) {
    return null;
  }
  return (
    <a
      href={row.customer.editUrl}
      className="inline-flex items-center gap-1 mt-1"
      title={_('View customer account')}
    >
      <Badge variant="outline">
        <User className="h-3 w-3" />
        {row.customer.fullName || _('Customer')}
      </Badge>
    </a>
  );
}

async function setRowStatus(api: string, status: string) {
  await axios.patch(api, { status });
  window.location.reload();
}

async function remove(api: string) {
  await axios.delete(api);
  window.location.reload();
}

function BulkActions({
  submissions,
  selectedIds
}: {
  submissions: SubmissionRow[];
  selectedIds: string[];
}) {
  const { openAlert, closeAlert } = useAlertContext();
  if (selectedIds.length === 0) {
    return null;
  }
  const selected = submissions.filter((s) => selectedIds.includes(s.uuid));
  const bulk = async (fn: (s: SubmissionRow) => Promise<unknown>) => {
    await Promise.all(selected.map(fn));
    window.location.reload();
  };
  return (
    <TableRow>
      <TableCell colSpan={100}>
        <ButtonGroup>
          <Button
            variant="outline"
            onClick={() =>
              bulk((s) => axios.patch(s.updateApi, { status: 'read' }))
            }
          >
            {_('Mark read')}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              bulk((s) => axios.patch(s.updateApi, { status: 'unread' }))
            }
          >
            {_('Mark unread')}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              bulk((s) => axios.patch(s.updateApi, { status: 'spam' }))
            }
          >
            {_('Mark spam')}
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              openAlert({
                heading: _('Delete ${count} messages', {
                  count: `${selectedIds.length}`
                }),
                content: _('Are you sure?'),
                primaryAction: {
                  title: _('Cancel'),
                  onAction: closeAlert,
                  variant: 'secondary'
                },
                secondaryAction: {
                  title: _('Delete'),
                  onAction: () => bulk((s) => axios.delete(s.deleteApi)),
                  variant: 'destructive'
                }
              });
            }}
          >
            {_('Delete')}
          </Button>
        </ButtonGroup>
      </TableCell>
    </TableRow>
  );
}

export default function ContactSubmissionGrid({
  contactSubmissions: { items: submissions, total, currentFilters = [] }
}: {
  contactSubmissions: {
    items: SubmissionRow[];
    total: number;
    currentFilters: Filter[];
  };
}) {
  const page = currentFilters.find((f) => f.key === 'page')
    ? parseInt(currentFilters.find((f) => f.key === 'page')!.value, 10)
    : 1;
  const limit = currentFilters.find((f) => f.key === 'limit')
    ? parseInt(currentFilters.find((f) => f.key === 'limit')!.value, 10)
    : 20;
  const statusFilter = currentFilters.find((f) => f.key === 'status')?.value;
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const setStatus = (status: string | null) => {
    const url = new URL(document.location.href);
    if (status) {
      url.searchParams.set('status[operation]', 'eq');
      url.searchParams.set('status[value]', status);
    } else {
      url.searchParams.delete('status[operation]');
      url.searchParams.delete('status[value]');
    }
    window.location.href = url.href;
  };

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <div className="flex gap-2 items-center">
          {[
            // No status filter means "inbox" — the collection hides spam
            // unless it is asked for by name, so labelling this "All" would
            // be a lie.
            { label: _('Inbox'), value: null },
            { label: _('Unread'), value: 'unread' },
            { label: _('Read'), value: 'read' },
            { label: _('Spam'), value: 'spam' }
          ].map((tab) => (
            <Button
              key={tab.value || 'all'}
              variant={
                (statusFilter || null) === tab.value ? 'default' : 'link'
              }
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <CardAction>
          <Form submitBtn={false} id="contactSubmissionGridFilter">
            <InputField
              name="keyword"
              placeholder={_('Search')}
              defaultValue={
                currentFilters.find((f) => f.key === 'keyword')?.value
              }
              onKeyPress={(e: any) => {
                if (e.key === 'Enter') {
                  const url = new URL(document.location.href);
                  const kw = e.target?.value;
                  if (kw) {
                    url.searchParams.set('keyword[operation]', 'like');
                    url.searchParams.set('keyword[value]', kw);
                  } else {
                    url.searchParams.delete('keyword[operation]');
                    url.searchParams.delete('keyword[value]');
                  }
                  window.location.href = url.href;
                }
              }}
            />
          </Form>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>
                <Checkbox
                  onCheckedChange={(checked) =>
                    setSelectedRows(
                      checked ? submissions.map((s) => s.uuid) : []
                    )
                  }
                />
              </TableCell>
              <TableCell>{_('Message')}</TableCell>
              <TableCell>{_('Status')}</TableCell>
              <TableCell>{_('Actions')}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <BulkActions submissions={submissions} selectedIds={selectedRows} />
            {submissions.map((s, i) => (
              <TableRow key={i}>
                <TableCell style={{ width: '2rem' }}>
                  <Checkbox
                    checked={selectedRows.includes(s.uuid)}
                    onCheckedChange={(checked) =>
                      setSelectedRows(
                        checked
                          ? selectedRows.concat([s.uuid])
                          : selectedRows.filter((row) => row !== s.uuid)
                      )
                    }
                  />
                </TableCell>
                <TableCell className="max-w-md align-top">
                  {s.subject && (
                    <div className="font-medium break-words">{s.subject}</div>
                  )}
                  <div className="max-w-md whitespace-pre-line break-words">
                    {s.message}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 break-words">
                    {s.name}
                    {s.email ? ` · ` : ''}
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        className="underline underline-offset-2"
                      >
                        {s.email}
                      </a>
                    )}
                    {s.phone ? ` · ${s.phone}` : ''}
                    {s.createdAt?.text ? ` · ${s.createdAt.text}` : ''}
                  </div>
                  <CustomerBadge row={s} />
                  <DeliveryBadge row={s} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell>
                  <ButtonGroup>
                    {s.status !== 'read' && (
                      <Button
                        variant="link"
                        onClick={() => setRowStatus(s.updateApi, 'read')}
                      >
                        {_('Mark read')}
                      </Button>
                    )}
                    {s.status === 'read' && (
                      <Button
                        variant="link"
                        onClick={() => setRowStatus(s.updateApi, 'unread')}
                      >
                        {_('Mark unread')}
                      </Button>
                    )}
                    {s.status !== 'spam' && (
                      <Button
                        variant="link"
                        onClick={() => setRowStatus(s.updateApi, 'spam')}
                      >
                        {_('Spam')}
                      </Button>
                    )}
                    <Button variant="link" onClick={() => remove(s.deleteApi)}>
                      {_('Delete')}
                    </Button>
                  </ButtonGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {submissions.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no message to display')}
          </div>
        )}
        <GridPagination total={total} limit={limit} page={page} />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: [FilterInput]) {
    contactSubmissions(filters: $filters) {
      items {
        uuid
        name
        email
        phone
        subject
        message
        status
        emailSent
        emailError
        createdAt {
          text(format: "LLL dd, yyyy t")
        }
        customer {
          uuid
          fullName
          editUrl
        }
        updateApi
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
