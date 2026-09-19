import { Editor, Row } from '@components/common/form/Editor.js';
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

interface BlogPostGeneralProps {
  post?: {
    blogPostId?: number;
    name?: string;
    status?: number;
    shortDescription?: string;
    description?: Row[];
  };
}

export default function General({ post }: BlogPostGeneralProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('General Information')}</CardTitle>
        <CardDescription>
          {_('The post title, status and content.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <InputField
            id="blog_post_name"
            name="name"
            label={_('Post Title')}
            placeholder={_('Enter post title')}
            defaultValue={post?.name}
            required
            validation={{ required: _('Post title is required') }}
          />
          <TextareaField
            name="short_description"
            label={_('Excerpt')}
            placeholder={_('A short summary shown in listings')}
            defaultValue={post?.shortDescription}
          />
          <div>
            <Editor
              label={_('Content')}
              name="description"
              value={post?.description || []}
              enableProductList
            />
          </div>
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
    post: blogPost(id: getContextValue("blogPostUuid", null)) {
      blogPostId
      name
      shortDescription
      description
    }
  }
`;
