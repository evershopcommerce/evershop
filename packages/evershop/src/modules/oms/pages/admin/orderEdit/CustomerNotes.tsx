import Area from '@components/common/Area.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

interface CustomerNotesProps {
  order: {
    shippingNote: string;
  };
}
export default function CustomerNotes({
  order: { shippingNote }
}: CustomerNotesProps) {
  return (
    <Card className="bg-popover">
      <CardHeader>
        <CardTitle>{_('Customer notes')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Area
          id="orderEditCustomerNotes"
          coreComponents={[
            {
              component: {
                default: () => (
                  <div>
                    {shippingNote || (
                      <span className="text-muted-foreground">
                        {_('No notes from customer')}
                      </span>
                    )}
                  </div>
                )
              },
              props: {},
              sortOrder: 10,
              id: 'title'
            }
          ]}
          noOuter
        />
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
    order(uuid: getContextValue("orderId")) {
      shippingNote
    }
  }
`;
