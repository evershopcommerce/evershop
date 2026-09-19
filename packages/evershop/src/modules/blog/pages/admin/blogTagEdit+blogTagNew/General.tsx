import { InputField } from '@components/common/form/InputField.js';
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

interface BlogTagGeneralProps {
  tag?: {
    blogTagId?: number;
    name?: string;
  };
}

export default function General({ tag }: BlogTagGeneralProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('General Information')}</CardTitle>
        <CardDescription>{_('The tag name.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <InputField
          id="blog_tag_name"
          name="name"
          label={_('Tag Name')}
          placeholder={_('Enter tag name')}
          defaultValue={tag?.name}
          required
          validation={{ required: _('Tag name is required') }}
        />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'wideScreen',
  sortOrder: 10
};

export const query = `
  query Query {
    tag: blogTag(id: getContextValue("blogTagUuid", null)) {
      blogTagId
      name
    }
  }
`;
