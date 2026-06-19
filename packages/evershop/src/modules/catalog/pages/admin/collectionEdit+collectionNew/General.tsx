import Area from '@components/common/Area.js';
import { Editor, Row } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import './General.scss';
import React from 'react';

interface GeneralProps {
  collection?: {
    collectionId?: string;
    name?: string;
    code?: string;
    description?: Row[];
  };
}

export default function General({ collection }: GeneralProps) {
  const fields = [
    {
      component: {
        default: (
          <InputField
            name="name"
            label={_('Collection Name')}
            placeholder={_('Enter Collection Name')}
            defaultValue={collection?.name || ''}
            required
          />
        )
      },
      sortOrder: 10,
      id: 'name'
    },
    {
      component: {
        default: (
          <InputField
            name="code"
            label={_('Collection Code')}
            defaultValue={collection?.code || ''}
            required
            validation={{
              required: _('Collection code is required'),
              pattern: {
                value: /^[a-zA-Z0-9_-]+$/,
                message: _(
                  'Collection code must be alphanumeric and can include underscores or dashes.'
                )
              }
            }}
            placeholder={_('Collection Code')}
          />
        )
      },
      sortOrder: 15,
      id: 'code'
    },
    {
      component: {
        default: (
          <Editor
            name="description"
            label={_('Description')}
            value={collection?.description || []}
          />
        )
      },
      sortOrder: 30
    }
  ];

  return (
    <Card title={_('General')}>
      <CardHeader>
        <CardTitle>{_('General Information')}</CardTitle>
        <CardDescription>
          {_('Manage general information about the collection.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Area
          id="collectionEditGeneral"
          coreComponents={fields}
          className="space-y-2"
        />
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'collectionFormInner',
  sortOrder: 10
};

export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      collectionId
      name
      code
      description
    }
  }
`;
