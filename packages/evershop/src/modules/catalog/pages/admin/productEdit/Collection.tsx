import { Card } from '@components/admin/Card.js';
import { TagIcon } from '@heroicons/react/24/solid';
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
    <Card title="Collections" subdued>
      <Card.Session>
        {collections.map((collection) => (
          <div
            className="flex justify-start gap-2 items-center align-middle"
            key={collection.uuid}
          >
            <TagIcon width={16} height={16} fill="#2c6ecb" />
            <a href={collection.editUrl} className="hover:underline">
              <span>{collection.name}</span>
            </a>
          </div>
        ))}
        {collections.length === 0 && (
          <div className="text-gray-500">No collections</div>
        )}
      </Card.Session>
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
