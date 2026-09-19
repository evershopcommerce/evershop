import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { useAlertContext } from '@components/common/modal/Alert.js';
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
import React, { useState } from 'react';

interface CommentRow {
  uuid: string;
  name: string;
  comment: string;
  status: string;
  postName?: string;
  createdAt?: string;
  moderateApi: string;
  deleteApi: string;
}

interface Filter {
  key: string;
  operation: string;
  value: string;
}

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  spam: 'bg-red-100 text-red-800'
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}

async function moderate(api: string, status: string) {
  await axios.patch(api, { status });
  window.location.reload();
}

async function remove(api: string) {
  await axios.delete(api);
  window.location.reload();
}

function BulkActions({
  comments,
  selectedIds
}: {
  comments: CommentRow[];
  selectedIds: string[];
}) {
  const { openAlert, closeAlert } = useAlertContext();
  if (selectedIds.length === 0) {
    return null;
  }
  const selected = comments.filter((c) => selectedIds.includes(c.uuid));
  const bulk = async (fn: (c: CommentRow) => Promise<unknown>) => {
    await Promise.all(selected.map(fn));
    window.location.reload();
  };
  return (
    <TableRow>
      <TableCell colSpan={100}>
        <ButtonGroup>
          <Button
            variant="outline"
            onClick={() => bulk((c) => axios.patch(c.moderateApi, { status: 'approved' }))}
          >
            {_('Approve')}
          </Button>
          <Button
            variant="outline"
            onClick={() => bulk((c) => axios.patch(c.moderateApi, { status: 'spam' }))}
          >
            {_('Mark spam')}
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              openAlert({
                heading: _('Delete ${count} comments', {
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
                  onAction: () => bulk((c) => axios.delete(c.deleteApi)),
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

export default function BlogCommentGrid({
  blogComments: { items: comments, total, currentFilters = [] }
}: {
  blogComments: {
    items: CommentRow[];
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
            { label: _('All'), value: null },
            { label: _('Pending'), value: 'pending' },
            { label: _('Approved'), value: 'approved' },
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
          <Form submitBtn={false} id="blogCommentGridFilter">
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
                    setSelectedRows(checked ? comments.map((c) => c.uuid) : [])
                  }
                />
              </TableCell>
              <TableCell>{_('Comment')}</TableCell>
              <TableCell>{_('Status')}</TableCell>
              <TableCell>{_('Actions')}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            <BulkActions comments={comments} selectedIds={selectedRows} />
            {comments.map((c, i) => (
              <TableRow key={i}>
                <TableCell style={{ width: '2rem' }}>
                  <Checkbox
                    checked={selectedRows.includes(c.uuid)}
                    onCheckedChange={(checked) =>
                      setSelectedRows(
                        checked
                          ? selectedRows.concat([c.uuid])
                          : selectedRows.filter((row) => row !== c.uuid)
                      )
                    }
                  />
                </TableCell>
                <TableCell className="max-w-md align-top">
                  <div className="max-w-md whitespace-pre-line break-words">
                    {c.comment}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 break-words">
                    {c.name}
                    {c.postName ? ` · ${c.postName}` : ''}
                    {c.createdAt
                      ? ` · ${new Date(c.createdAt).toLocaleString()}`
                      : ''}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell>
                  <ButtonGroup>
                    {c.status !== 'approved' && (
                      <Button
                        variant="link"
                        onClick={() => moderate(c.moderateApi, 'approved')}
                      >
                        {_('Approve')}
                      </Button>
                    )}
                    {c.status !== 'spam' && (
                      <Button
                        variant="link"
                        onClick={() => moderate(c.moderateApi, 'spam')}
                      >
                        {_('Spam')}
                      </Button>
                    )}
                    <Button
                      variant="link"
                      onClick={() => remove(c.deleteApi)}
                    >
                      {_('Delete')}
                    </Button>
                  </ButtonGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {comments.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no comment to display')}
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
    blogComments(filters: $filters) {
      items {
        uuid
        name
        comment
        status
        postName
        createdAt
        moderateApi
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
