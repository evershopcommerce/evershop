import { GridPagination } from '@components/admin/grid/GridPagination.js';
import { SortableHeader } from '@components/admin/grid/header/Sortable.js';
import { Status } from '@components/admin/Status.js';
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

interface CategoryRow {
  uuid: string;
  name: string;
  status: number;
  editUrl: string;
  updateApi: string;
  deleteApi: string;
}

interface Filter {
  key: string;
  operation: string;
  value: string;
}

function Actions({
  categories = [],
  selectedIds = []
}: {
  categories: CategoryRow[];
  selectedIds: string[];
}) {
  const { openAlert, closeAlert } = useAlertContext();

  const update = async (status: number) => {
    await Promise.all(
      categories
        .filter((c) => selectedIds.includes(c.uuid))
        .map((c) => axios.patch(c.updateApi, { status }))
    );
    window.location.reload();
  };

  const remove = async () => {
    await Promise.all(
      categories
        .filter((c) => selectedIds.includes(c.uuid))
        .map((c) => axios.delete(c.deleteApi))
    );
    window.location.reload();
  };

  const confirm = (
    heading: string,
    label: string,
    onAction: () => Promise<void>
  ) =>
    openAlert({
      heading,
      content: _('Are you sure?'),
      primaryAction: {
        title: _('Cancel'),
        onAction: closeAlert,
        variant: 'secondary'
      },
      secondaryAction: { title: label, onAction, variant: 'destructive' }
    });

  const actions = [
    {
      name: _('Enable'),
      onAction: () =>
        confirm(
          _('Enable ${count} categories', { count: `${selectedIds.length}` }),
          _('Enable'),
          () => update(1)
        )
    },
    {
      name: _('Disable'),
      onAction: () =>
        confirm(
          _('Disable ${count} categories', { count: `${selectedIds.length}` }),
          _('Disable'),
          () => update(0)
        )
    },
    {
      name: _('Delete'),
      onAction: () =>
        confirm(
          _('Delete ${count} categories', { count: `${selectedIds.length}` }),
          _('Delete'),
          remove
        )
    }
  ];

  if (selectedIds.length === 0) {
    return null;
  }
  return (
    <TableRow>
      <TableCell colSpan={100}>
        <ButtonGroup>
          {actions.map((action, i) => (
            <Button
              key={i}
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                action.onAction();
              }}
            >
              {action.name}
            </Button>
          ))}
        </ButtonGroup>
      </TableCell>
    </TableRow>
  );
}

export default function BlogCategoryGrid({
  blogCategories: { items: categories, total, currentFilters = [] }
}: {
  blogCategories: {
    items: CategoryRow[];
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
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <Card>
      <CardHeader className="flex justify-between">
        <Form submitBtn={false} id="blogCategoryGridFilter">
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
                    setSelectedRows(
                      checked ? categories.map((c) => c.uuid) : []
                    )
                  }
                />
              </TableCell>
              <SortableHeader
                title={_('Name')}
                name="name"
                currentFilters={currentFilters}
              />
              <SortableHeader
                title={_('Status')}
                name="status"
                currentFilters={currentFilters}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions categories={categories} selectedIds={selectedRows} />
            {categories.map((c, i) => (
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
                <TableCell>
                  <a href={c.editUrl} className="hover:underline font-medium">
                    {c.name}
                  </a>
                </TableCell>
                <TableCell>
                  <Status status={parseInt(`${c.status}`, 10)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {categories.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no category to display')}
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
    blogCategories (filters: $filters) {
      items {
        blogCategoryId
        uuid
        name
        status
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
