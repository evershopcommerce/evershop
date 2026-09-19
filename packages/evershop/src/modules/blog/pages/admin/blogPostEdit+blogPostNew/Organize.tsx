import { ImageUploader } from '@components/admin/ImageUploader.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import { ReactSelectField } from '@components/common/form/ReactSelectField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * Single-image thumbnail field bridging the admin ImageUploader to react-hook-form.
 * Stores the uploaded image URL in the `thumbnail` form field.
 */
function ThumbnailField({
  name,
  defaultValue
}: {
  name: string;
  defaultValue?: string;
}) {
  const { register, setValue } = useFormContext();

  React.useEffect(() => {
    setValue(name, defaultValue ?? '');
  }, []);

  const current = defaultValue
    ? [{ uuid: 'thumbnail', url: defaultValue }]
    : [];

  return (
    <div className="space-y-2">
      <label className="block font-medium">{_('Thumbnail')}</label>
      <ImageUploader
        isMultiple={false}
        currentImages={current}
        onUpload={(images) => setValue(name, images[0]?.url ?? '')}
        onDelete={() => setValue(name, '')}
      />
      <input
        type="hidden"
        {...register(name)}
        defaultValue={defaultValue ?? ''}
      />
    </div>
  );
}

interface OrganizeProps {
  post?: {
    thumbnail?: string;
    authorId?: number;
    category?: { blogCategoryId?: number } | null;
    tags?: Array<{ blogTagId?: number }>;
    status?: number;
  };
  categories?: { items?: Array<{ blogCategoryId: number; name: string }> };
  tags?: { items?: Array<{ blogTagId: number; name: string }> };
  authors?: { items?: Array<{ adminUserId: number; fullName: string }> };
}

export default function Organize({
  post,
  categories,
  tags,
  authors
}: OrganizeProps) {
  const categoryOptions = (categories?.items || []).map((c) => ({
    value: c.blogCategoryId,
    label: c.name
  }));
  const tagOptions = (tags?.items || []).map((t) => ({
    value: t.blogTagId,
    label: t.name
  }));
  const authorOptions = (authors?.items || []).map((a) => ({
    value: a.adminUserId,
    label: a.fullName
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Organize')}</CardTitle>
        <CardDescription>
          {_('Category, author, tags and thumbnail.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroupField
          name="status"
          label={_('Status')}
          options={[
            { value: 1, label: _('Published') },
            { value: 0, label: _('Draft') }
          ]}
          defaultValue={post?.status ?? 0}
          required
          helperText={_('Published posts are visible on the storefront.')}
        />
      </CardContent>
      <CardContent className="border-t border-t-border pt-6">
        <div className="space-y-3">
          <SelectField
            name="category_id"
            label={_('Category')}
            placeholder={_('Select a category')}
            options={categoryOptions}
            defaultValue={post?.category?.blogCategoryId}
          />
          <SelectField
            name="author_id"
            label={_('Author')}
            placeholder={_('Select an author')}
            options={authorOptions}
            defaultValue={post?.authorId}
          />
          <ReactSelectField
            name="tags"
            label={_('Tags')}
            isMulti
            options={tagOptions}
            defaultValue={(post?.tags || [])
              .map((t) => t.blogTagId)
              .filter((id): id is number => typeof id === 'number')}
            placeholder={_('Select tags')}
          />
        </div>
      </CardContent>
      <CardContent className="border-t border-t-border pt-6">
        <ThumbnailField name="thumbnail" defaultValue={post?.thumbnail} />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    post: blogPost(id: getContextValue("blogPostUuid", null)) {
      thumbnail
      authorId
      status
      category {
        blogCategoryId
      }
      tags {
        blogTagId
      }
    }
    categories: blogCategories(filters: [{ key: "limit", operation: eq, value: "1000" }]) {
      items {
        blogCategoryId
        name
      }
    }
    tags: blogTags(filters: [{ key: "limit", operation: eq, value: "1000" }]) {
      items {
        blogTagId
        name
      }
    }
    authors: adminUsers(filters: [{ key: "limit", operation: eq, value: "1000" }]) {
      items {
        adminUserId
        fullName
      }
    }
  }
`;
