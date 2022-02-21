import React from 'react';
import Area from '../../../../../../lib/components/Area';
import { useAppState } from '../../../../../../lib/context/app';
import { get } from '../../../../../../lib/util/get';
import { Card } from '../../../../../cms/views/admin/Card';

export default function CustomerNotes() {
  const order = get(useAppState(), 'order', {});
  return (
    <Card title="Customer notes">
      <Card.Session>
        <Area
          id="orderEditCustomerNotes"
          coreComponents={[
            {
              component: {
                // eslint-disable-next-line react/no-unstable-nested-components
                default: () => <div>{order.shipping_note || <span className="text-border">No notes from customer</span>}</div>
              },
              props: {
              },
              sortOrder: 10,
              id: 'title'
            }
          ]}
          noOuter
        />
      </Card.Session>
    </Card>
  );
}
