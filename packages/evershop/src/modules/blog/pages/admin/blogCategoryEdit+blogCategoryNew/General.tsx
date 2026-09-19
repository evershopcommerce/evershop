import { InputField } from '@components/common/form/InputField.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import './General.scss';

interface BlogCategoryGeneralProps {
  category?: {
    blogCategoryId?: number;
    name?: string;
    status?: number;
    shortDescription?: string;
  };
}

export default function General({ category }: BlogCategoryGeneralProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('General Information')}</CardTitle>
        <CardDescription>
          {_('Name and status for this blog category.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <InputField
            id="blog_category_name"
            name="name"
            label={_('Category Name')}
            placeholder={_('Enter category name')}
            defaultValue={category?.name}
            required
            validation={{ required: _('Category name is required') }}
          />
          <TextareaField
            name="short_description"
            label={_('Short Description')}
            placeholder={_('A short description shown on the category page')}
            defaultValue={category?.shortDescription}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    category: blogCategory(id: getContextValue("blogCategoryUuid", null)) {
      blogCategoryId
      name
      status
      shortDescription
    }
  }
`;
