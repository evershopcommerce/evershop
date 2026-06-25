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

interface PostRow {
  uuid: string;
  name: string;
  status: number;
  category?: { name: string } | null;
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
  posts = [],
  selectedIds = []
}: {
  posts: PostRow[];
  selectedIds: string[];
}) {
  const { openAlert, closeAlert } = useAlertContext();

  const updatePosts = async (status: number) => {
    await Promise.all(
      posts
        .filter((post) => selectedIds.includes(post.uuid))
        .map((post) => axios.patch(post.updateApi, { status }))
    );
    window.location.reload();
  };

  const deletePosts = async () => {
    await Promise.all(
      posts
        .filter((post) => selectedIds.includes(post.uuid))
        .map((post) => axios.delete(post.deleteApi))
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
      name: _('Publish'),
      onAction: () =>
        confirm(
          _('Publish ${count} posts', { count: `${selectedIds.length}` }),
          _('Publish'),
          () => updatePosts(1)
        )
    },
    {
      name: _('Unpublish'),
      onAction: () =>
        confirm(
          _('Unpublish ${count} posts', { count: `${selectedIds.length}` }),
          _('Unpublish'),
          () => updatePosts(0)
        )
    },
    {
      name: _('Delete'),
      onAction: () =>
        confirm(
          _('Delete ${count} posts', { count: `${selectedIds.length}` }),
          _('Delete'),
          deletePosts
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

export default function BlogPostGrid({
  blogPosts: { items: posts, total, currentFilters = [] },
  categories
}: {
  blogPosts: { items: PostRow[]; total: number; currentFilters: Filter[] };
  categories?: { items?: Array<{ blogCategoryId: number; name: string }> };
}) {
  const currentCategory =
    currentFilters.find((f) => f.key === 'category')?.value ?? '';
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
        <Form submitBtn={false} id="blogPostGridFilter">
          <div className="flex gap-3 items-center">
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
            <select
              className="border border-input rounded-md px-3 h-9 text-sm bg-transparent"
              value={currentCategory}
              onChange={(e) => {
                const value = e.target.value;
                const url = new URL(document.location.href);
                if (value) {
                  url.searchParams.set('category[operation]', 'eq');
                  url.searchParams.set('category[value]', value);
                } else {
                  url.searchParams.delete('category[operation]');
                  url.searchParams.delete('category[value]');
                }
                window.location.href = url.href;
              }}
            >
              <option value="">{_('All categories')}</option>
              {(categories?.items || []).map((c) => (
                <option key={c.blogCategoryId} value={String(c.blogCategoryId)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
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
                    setSelectedRows(checked ? posts.map((p) => p.uuid) : [])
                  }
                />
              </TableCell>
              <SortableHeader
                title={_('Name')}
                name="name"
                currentFilters={currentFilters}
              />
              <TableCell className="font-medium uppercase text-xs">
                {_('Category')}
              </TableCell>
              <SortableHeader
                title={_('Status')}
                name="status"
                currentFilters={currentFilters}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            <Actions posts={posts} selectedIds={selectedRows} />
            {posts.map((p, i) => (
              <TableRow key={i}>
                <TableCell style={{ width: '2rem' }}>
                  <Checkbox
                    checked={selectedRows.includes(p.uuid)}
                    onCheckedChange={(checked) =>
                      setSelectedRows(
                        checked
                          ? selectedRows.concat([p.uuid])
                          : selectedRows.filter((row) => row !== p.uuid)
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <a href={p.editUrl} className="hover:underline font-medium">
                    {p.name}
                  </a>
                </TableCell>
                <TableCell>{p.category?.name || '—'}</TableCell>
                <TableCell>
                  <Status status={parseInt(`${p.status}`, 10)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {posts.length === 0 && (
          <div className="flex w-full justify-center mt-2">
            {_('There is no post to display')}
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
    blogPosts (filters: $filters) {
      items {
        blogPostId
        uuid
        name
        status
        category {
          name
        }
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
    categories: blogCategories(
      filters: [{ key: "limit", operation: eq, value: "1000" }]
    ) {
      items {
        blogCategoryId
        name
      }
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
