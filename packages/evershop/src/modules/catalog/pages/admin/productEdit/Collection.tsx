import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { TagIcon } from 'lucide-react';
import React from 'react';

export interface Collection {
  uuid: string;
  name: string;
  editUrl: string;
}
export default function Collections({
  product: { collections }
}: {
  product: {
    collections: Collection[];
  };
}): React.ReactElement {
  return (
    <Card className="bg-popover">
      <CardHeader>
        <CardTitle>{_('Collections')}</CardTitle>
        <CardDescription>
          {_('Manage the collections associated with this product.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {collections.map((collection) => (
          <div
            className="flex justify-start gap-2 items-center align-middle"
            key={collection.uuid}
          >
            <TagIcon width={16} height={16} />
            <a href={collection.editUrl} className="hover:underline">
              <span>{collection.name}</span>
            </a>
          </div>
        ))}
        {collections.length === 0 && (
          <div className="text-gray-500">{_('No collections')}</div>
        )}
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      collections {
        uuid
        name
        editUrl
      }
    }
  }
`;
