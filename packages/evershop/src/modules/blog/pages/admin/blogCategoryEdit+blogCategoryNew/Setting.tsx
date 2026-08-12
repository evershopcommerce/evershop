import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface BlogCategorySettingProps {
  category?: {
    name?: string;
    status?: number;
    commentPolicy?: string;
  };
}

export default function Setting({ category }: BlogCategorySettingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{_('Settings')}</CardTitle>
        <CardDescription>
          {_('Configure URL key and meta information for this blog category.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroupField
          name="status"
          label={_('Status')}
          options={[
            { value: 1, label: _('Enabled') },
            { value: 0, label: _('Disabled') }
          ]}
          defaultValue={category?.status ?? 1}
          required
        />
      </CardContent>
      <CardContent className="border-t border-t-border pt-6">
        <RadioGroupField
          name="comment_policy"
          label={_('Comment Policy')}
          options={[
            { value: 'open', label: _('Open — auto-approve') },
            { value: 'moderated', label: _('Moderated — hold for review') },
            { value: 'closed', label: _('Closed — no new comments') }
          ]}
          defaultValue={category?.commentPolicy ?? 'moderated'}
          required
          helperText={_('Applies to posts in this category.')}
        />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 20
};

export const query = `
  query Query {
    category: blogCategory(id: getContextValue("blogCategoryUuid", null)) {
      name
      status
      commentPolicy
    }
  }
`;
