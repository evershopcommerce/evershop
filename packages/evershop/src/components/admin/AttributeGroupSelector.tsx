import { Card } from '@components/admin/Card.js';
import { SimplePagination } from '@components/common/SimplePagination.js';
import { CheckIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useQuery } from 'urql';
import './AttributeGroupSelector.scss';
import { AtLeastOne } from '../../types/atLeastOne.js';

const SearchQuery = `
  query Query ($filters: [FilterInput!]) {
    attributeGroups(filters: $filters) {
      items {
        attributeGroupId
        uuid
        groupName
      }
      total
    }
  }
`;

interface AttributeGroupIdentifier {
  attributeGroupId?: string | number;
  uuid?: string;
}

const AttributeGroupListSkeleton: React.FC = () => {
  const skeletonItems = Array(5).fill(0);

  return (
    <div className="attribute-group-list-skeleton">
      {skeletonItems.map((_, index) => (
        <div
          key={index}
          className="attribute-group-skeleton-item border-b flex justify-between items-center"
        >
          <div className="flex items-center">
            <div>
              <div className="skeleton-title h-5 w-30 bg-gray-200 rounded skeleton-pulse mb-2"></div>
              <div className="skeleton-id h-4 w-20 bg-gray-200 rounded skeleton-pulse"></div>
            </div>
          </div>
          <div className="select-button">
            <div className="skeleton-button h-6 w-12 bg-gray-200 rounded skeleton-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const isAttributeGroupSelected = (
  attributeGroup: AttributeGroupIdentifier,
  selectedAttributeGroups: AtLeastOne<AttributeGroupIdentifier>[]
): boolean => {
  return selectedAttributeGroups.some(
    (selected) =>
      (selected?.attributeGroupId &&
        selected.attributeGroupId === attributeGroup.attributeGroupId) ||
      (selected?.uuid && selected.uuid === attributeGroup.uuid)
  );
};

const AttributeGroupSelector: React.FC<{
  onSelect: (id: string | number, uuid: string, name: string) => void;
  onUnSelect: (id: string | number, uuid: string, name: string) => void;
  selectedAttributeGroups: AtLeastOne<AttributeGroupIdentifier>[];
}> = ({ onSelect, onUnSelect, selectedAttributeGroups }) => {
  const [internalSelectedAttributeGroups, setInternalSelectedAttributeGroups] =
    React.useState<AtLeastOne<AttributeGroupIdentifier>[]>(
      selectedAttributeGroups || []
    );
  const [loading, setLoading] = React.useState<boolean>(false);
  const limit = 10;
  const [inputValue, setInputValue] = React.useState<string>('');
  const [page, setPage] = React.useState(1);

  const [result, reexecuteQuery] = useQuery({
    query: SearchQuery,
    variables: {
      filters: inputValue
        ? [
            { key: 'name', operation: 'like', value: inputValue },
            { key: 'page', operation: 'eq', value: page.toString() },
            { key: 'limit', operation: 'eq', value: limit.toString() }
          ]
        : [
            { key: 'limit', operation: 'eq', value: limit.toString() },
            { key: 'page', operation: 'eq', value: page.toString() }
          ]
    },
    pause: true
  });

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, [page]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (inputValue !== '') {
        reexecuteQuery({ requestPolicy: 'network-only' });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, fetching, error } = result as {
    data: {
      attributeGroups: {
        items: Array<{
          attributeGroupId: string | number;
          uuid: string;
          groupName: string;
        }>;
        total: number;
      };
    };
    fetching: boolean;
    error: Error | undefined;
  };

  if (error) {
    return (
      <p className="text-critical">
        There was an error fetching attribute groups.
        {error.message}
      </p>
    );
  }

  return (
    <Card title="Select Attribute Groups">
      <Card.Session>
        <div>
          <div className="border rounded border-divider mb-5">
            <input
              type="text"
              value={inputValue || ''}
              placeholder="Search attribute groups"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setInputValue(e.target.value);
                setLoading(true);
              }}
            />
          </div>
          {(fetching || loading) && <AttributeGroupListSkeleton />}
          {!fetching && data && (
            <div className="divide-y">
              {data.attributeGroups.items.length === 0 && (
                <div className="p-2 border border-divider rounded flex justify-center items-center">
                  {inputValue ? (
                    <p>
                      No attribute groups found for query &quot;{inputValue}
                      &rdquo;
                    </p>
                  ) : (
                    <p>You have no attribute groups to display</p>
                  )}
                </div>
              )}
              {data.attributeGroups.items.map((a) => (
                <div
                  key={a.uuid}
                  className="grid grid-cols-8 gap-5 py-2 border-divider items-center"
                >
                  <div className="col-span-5">
                    <h3>{a.groupName}</h3>
                  </div>
                  <div className="col-span-3 text-right">
                    {!isAttributeGroupSelected(
                      a,
                      internalSelectedAttributeGroups
                    ) && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={async (e) => {
                          e.preventDefault();
                          setInternalSelectedAttributeGroups((prev) => [
                            ...prev,
                            {
                              attributeGroupId: a.attributeGroupId,
                              uuid: a.uuid,
                              groupName: a.groupName
                            }
                          ]);
                          onSelect(a.attributeGroupId, a.uuid, a.groupName);
                        }}
                      >
                        Select
                      </button>
                    )}
                    {isAttributeGroupSelected(
                      a,
                      internalSelectedAttributeGroups
                    ) && (
                      <a
                        className="button primary"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setInternalSelectedAttributeGroups((prev) =>
                            prev.filter(
                              (c) =>
                                c.attributeGroupId !== a.attributeGroupId &&
                                c.uuid !== a.uuid
                            )
                          );
                          onUnSelect(a.attributeGroupId, a.uuid, a.groupName);
                        }}
                      >
                        <CheckIcon className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card.Session>
      <Card.Session>
        <div className="flex justify-between gap-5">
          <SimplePagination
            total={data?.attributeGroups.total || 0}
            count={data?.attributeGroups?.items?.length || 0}
            page={page}
            hasNext={limit * page < data?.attributeGroups.total}
            setPage={setPage}
          />
        </div>
      </Card.Session>
    </Card>
  );
};

export { AttributeGroupSelector };
