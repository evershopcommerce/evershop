import { FormButtons } from '@components/admin/FormButtons.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import React from 'react';

interface CollectionEditFormProps {
  action: string;
  gridUrl: string;
}

export default function CollectionEditForm({
  action,
  gridUrl
}: CollectionEditFormProps) {
  return (
    <Form
      action={action}
      method="PATCH"
      id="collectionEditForm"
      submitBtn={false}
    >
      <div className="w-2/3" style={{ margin: '0 auto' }}>
        <div className="grid gap-5">
          <Area id="collectionFormInner" noOuter />
        </div>
        <FormButtons formId="collectionEditForm" cancelUrl={gridUrl} />
      </div>
    </Form>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updateCollection", params: [{key: "id", value: getContextValue("collectionUuid")}]),
    gridUrl: url(routeId: "collectionGrid")
  }
`;
