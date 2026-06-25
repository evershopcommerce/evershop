import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { SortableHeader } from '@components/admin/grid/header/Sortable.js';
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
import './General.scss';

interface TagRow {
  uuid: string;
  name: string;
  editUrl: string;
  deleteApi: string;
}

interface Filter {
  key: string;
  operation: string;
  value: string;
}

function Actions({
  tags = [],
  selectedIds = []
}: {
  tags: TagRow[];
  selectedIds: string[];
}) {
  const { openAlert, closeAlert } = useAlertContext();

  const remove = async () => {
    await Promise.all(
      tags
        .filter((t) => selectedIds.includes(t.uuid))
        .map((t) => axios.delete(t.deleteApi))
    );
    window.location.reload();
  };

  if (selectedIds.length === 0) {
    return null;
  }
  return (
    <TableRow>
      <TableCell colSpan={100}>
        <ButtonGroup>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              openAlert({
                heading: _('Delete ${count} tags', {
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
                  onAction: remove,
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

export default function BlogTagGrid({
  blogTags: { items: tags, total, currentFilters = [] }
}: {
  blogTags: { items: TagRow[]; total: number; currentFilters: Filter[] };
}) {
  const page = currentFilters.find((f) => f.key === 'page')
    ? parseInt(currentFilters.find((f) => f.key === 'page')!.value, 10)
    : 1;
  const limit = currentFilters.find((f) => f.key === 'limit')
    ? parseInt(currentFilters.find((f) => f.key === 'limit')!.value, 10)
    : 20;
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <Form submitBtn={false} id="blogTagGridFilter">
          <InputField
            name="name"
            placeholder={_('Search')}
            defaultValue={currentFilters.find((f) => f.key === 'name')?.value}
            onKeyPress={(e: any) => {
              if (e.key === 'Enter') {
                const url = new URL(document.location.href);
                const name = e.target?.value;
                if (name) {
                  url.searchParams.set('name[operation]', 'like');
                  url.searchParams.set('name[value]', name);
                } else {
                  url.searchParams.delete('name[operation]');
                  url.searchParams.delete('name[value]');
                }
                window.location.href = url.href;
              }
            }}
          />
        </Form>
        <CardAction>
          <Button
            variant="link"
            onClick={() => {
              const url = new URL(document.location.href);
              url.search = '';
              window.location.href = url.href;
            }}
          >
            {_('Clear filter')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell>
                <Checkbox
                  onCheckedChange={(checked) =>
                    setSelectedRows(checked ? tags.map((t) => t.uuid) : [])
                  }
                />
              </TableCell>
              <SortableHeader
                title={_('Name')}
                name="name"
                currentFilters={currentFilters}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions tags={tags} selectedIds={selectedRows} />
            {tags.map((t, i) => (
              <TableRow key={i}>
                <TableCell style={{ width: '2rem' }}>
                  <Checkbox
                    checked={selectedRows.includes(t.uuid)}
                    onCheckedChange={(checked) =>
                      setSelectedRows(
                        checked
                          ? selectedRows.concat([t.uuid])
                          : selectedRows.filter((row) => row !== t.uuid)
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <a href={t.editUrl} className="hover:underline font-medium">
                    {t.name}
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {tags.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no tag to display')}
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
    blogTags (filters: $filters) {
      items {
        blogTagId
        uuid
        name
        editUrl
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
