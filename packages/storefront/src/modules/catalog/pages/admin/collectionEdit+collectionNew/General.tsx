import { Card } from '@components/admin/Card.js';
import Area from '@components/common/Area.js';
import { Editor, Row } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
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
            label="Collection Name"
            placeholder="Enter Collection Name"
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
            label="Collection Code"
            defaultValue={collection?.code || ''}
            validation={{
              required: 'Collection code is required',
              pattern: {
                value: /^[a-zA-Z0-9_-]+$/,
                message:
                  'Collection code must be alphanumeric and can include underscores or dashes.'
              }
            }}
            placeholder="Collection Code"
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
            label="Description"
            value={collection?.description || []}
          />
        )
      },
      sortOrder: 30
    }
  ];

  return (
    <Card title="General">
      <Card.Session>
        <Area id="collectionEditGeneral" coreComponents={fields} />
      </Card.Session>
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
